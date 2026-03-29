from fastapi import APIRouter, Depends, Body, File, UploadFile, BackgroundTasks, HTTPException, Request
from typing import List, Dict, Any, Optional, cast
import os
import io
import uuid
import sqlite3
import pandas as pd
from app.api.v1.deps import get_current_user, require_user_roles
from app.engines.workspace_engine import WorkspaceEngine
from app.core.database_manager import DB_PATH
from app.services.file_persistence import get_file_storage
from app.services.integration_service import IntegrationService
from app.services.pipeline_controller import run_pipeline
try:
    from app.services.redis_cache import redis_cache
except Exception:
    redis_cache = None

router = APIRouter()
ENFORCE_TENANT_CONTEXT = os.getenv("ENFORCE_TENANT_CONTEXT", "false").lower() == "true"
DASHBOARD_CACHE_TTL_SECONDS = int(os.getenv("DASHBOARD_CACHE_TTL_SECONDS", "300"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
_CACHE_READY = False


def _resolve_company_id(current_user: dict) -> str:
    company_id = current_user.get("company_id")
    if ENFORCE_TENANT_CONTEXT and (not company_id or company_id == "DEFAULT"):
        raise HTTPException(
            status_code=400,
            detail="Tenant context is required. Complete organization onboarding first.",
        )
    return company_id or "DEFAULT"


def _json_safe_records(df: pd.DataFrame, limit: int = 5000) -> List[Dict[str, Any]]:
    sample = df.head(limit).copy()
    sample = sample.where(pd.notnull(sample), None)
    return cast(List[Dict[str, Any]], sample.to_dict(orient="records"))


async def _ensure_cache_ready() -> bool:
    global _CACHE_READY
    if redis_cache is None:
        return False
    if _CACHE_READY:
        return True
    try:
        _CACHE_READY = await redis_cache.connect(REDIS_URL)
        return _CACHE_READY
    except Exception:
        _CACHE_READY = False
        return False


def _dashboard_cache_key(company_id: str) -> str:
    return f"workspace:dashboard_sync:{company_id}"


async def _get_dashboard_cache(company_id: str) -> Optional[dict]:
    if not await _ensure_cache_ready():
        return None
    try:
        return cast(Optional[dict], await redis_cache.get(_dashboard_cache_key(company_id)))
    except Exception:
        return None


async def _set_dashboard_cache(company_id: str, payload: dict) -> None:
    if not await _ensure_cache_ready():
        return
    try:
        await redis_cache.set(_dashboard_cache_key(company_id), payload, DASHBOARD_CACHE_TTL_SECONDS)
    except Exception:
        return


async def _invalidate_dashboard_cache(company_id: str) -> None:
    if not await _ensure_cache_ready():
        return
    try:
        await redis_cache.delete(_dashboard_cache_key(company_id))
    except Exception:
        return

@router.get("/integrity")
async def get_workspace_integrity(current_user: dict = Depends(get_current_user)):
    """Enterprise Health: Returns record counts across all segregated silos."""
    return WorkspaceEngine.get_workspace_integrity(_resolve_company_id(current_user))


@router.post("/universal-upload")
async def universal_upload(
    files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_user)
):
    """
    Enterprise Data Nexus: Universal gateway for bulk CSV/Excel ingestion.
    Supports auto-segregation of Invoices, Customers, Inventory, Staff, and Ledger.
    Files are automatically persisted to user account.
    """
    files_metadata: List[Dict[str, Any]] = []
    file_storage = get_file_storage()
    
    user_id = current_user.get("id") or 1
    user_email = current_user.get("email", "unknown")
    company_id = _resolve_company_id(current_user)
    
    file_user_id = user_email if user_email != "unknown" else f"user_{user_id}"
    
    for file in files:
        if file.filename:
            content = await file.read()
            try:
                storage_result = file_storage.save_file(
                    user_id=file_user_id,
                    file_content=content,
                    filename=file.filename,
                    file_type=os.path.splitext(file.filename)[1].strip("."),
                    metadata={"source": "workspace_universal_upload"}
                )
                files_metadata.append({
                    "name": cast(str, file.filename), 
                    "content": content,
                    "dataset_id": storage_result["dataset_id"],
                    "persistent": True
                })
            except Exception as persist_error:
                print(f"File persistence warning: {persist_error}")
                files_metadata.append({
                    "name": cast(str, file.filename), 
                    "content": content,
                    "persistent": False
                })

    result = WorkspaceEngine.process_universal_upload(
        user_id, 
        company_id, 
        files_metadata
    )
    await _invalidate_dashboard_cache(company_id)
    
    result["files_persisted"] = len([f for f in files_metadata if f.get("persistent")])
    result["message"] = "Files uploaded and linked to your account. Accessible on future logins."
    
    return result


@router.post("/sync-to-dashboard")
async def sync_to_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Rebuild dashboard payload directly from workspace tables.
    This lets users sign in and continue without re-uploading files.
    """
    company_id = _resolve_company_id(current_user)
    cached = await _get_dashboard_cache(company_id)
    if cached:
        return cached
    df = WorkspaceEngine.get_enterprise_analytics_df(company_id=company_id)
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="No workspace data available for dashboard sync")

    payload = run_pipeline(df)
    if payload.get("error"):
        raise HTTPException(status_code=500, detail=str(payload["error"]))

    raw_df = payload.pop("_df", df)
    raw_records = _json_safe_records(raw_df, limit=5000)

    numeric_columns = [c for c in raw_df.columns if pd.api.types.is_numeric_dtype(raw_df[c])]
    categorical_columns = [c for c in raw_df.columns if c not in numeric_columns]

    dataset_id = f"{company_id}-{uuid.uuid4().hex[:10]}"
    response_payload = {
        "dataset_id": dataset_id,
        "rows": int(len(raw_df)),
        "columns": [str(c) for c in raw_df.columns],
        "numeric_columns": [str(c) for c in numeric_columns],
        "categorical_columns": [str(c) for c in categorical_columns],
        "raw_data": raw_records,
        **payload,
    }
    await _set_dashboard_cache(company_id, response_payload)
    return response_payload


@router.post("/additional-upload")
async def additional_csv_upload(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Additional CSV upload for existing enterprise customers. Files are persisted."""
    files_metadata = []
    file_storage = get_file_storage()
    
    user_id = current_user.get("id") or 1
    user_email = current_user.get("email", "unknown")
    company_id = _resolve_company_id(current_user)
    
    file_user_id = user_email if user_email != "unknown" else f"user_{user_id}"
    
    for file in files:
        content = await file.read()
        try:
            storage_result = file_storage.save_file(
                user_id=file_user_id,
                # ... file save logic (abbreviated for the chunk)
                file_content=content,
                filename=file.filename,
                file_type=os.path.splitext(file.filename)[1].strip("."),
                metadata={"source": "workspace_additional_upload"}
            )
            files_metadata.append({
                "name": file.filename, 
                "content": content,
                "dataset_id": storage_result["dataset_id"],
                "persistent": True
            })
        except Exception as persist_error:
            print(f"File persistence warning: {persist_error}")
            files_metadata.append({
                "name": file.filename, 
                "content": content,
                "persistent": False
            })

    result = WorkspaceEngine.process_universal_upload(
        user_id, company_id, files_metadata
    )
    await _invalidate_dashboard_cache(company_id)
    
    result["files_persisted"] = len([f for f in files_metadata if f.get("persistent")])
    result["message"] = "Files uploaded and saved to your account. Access anytime without reupload."

    if result.get("status") == "SUCCESS":
        subject = "New Data Successfully Uploaded to NeuralBI"
        body = f"Your additional business data has been successfully uploaded." # Abbreviated
        background_tasks.add_task(
            IntegrationService.send_email, current_user["email"], subject, body
        )

    return result

# --- INVOICES ---
@router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    company_id = _resolve_company_id(current_user)
    return WorkspaceEngine.get_invoices(company_id=company_id)

@router.post("/invoices")
async def create_invoice(
    request: Request,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "SALES")),
):
    body = await request.json()
    if "data" in body and isinstance(body["data"], dict):
        data = body["data"]
        user_id = body.get("user", {}).get("id", current_user.get("id", 1))
    else:
        data = body
        user_id = current_user.get("id", 1)
    result = WorkspaceEngine.create_invoice(data, user_id=user_id)
    await _invalidate_dashboard_cache(_resolve_company_id(current_user))
    return result

@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    request: Request,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "SALES")),
):
    body = await request.json()
    if "data" in body and isinstance(body["data"], dict):
        data = body["data"]
        user_id = body.get("user", {}).get("id", current_user.get("id", 1))
    else:
        data = body
        user_id = current_user.get("id", 1)
    result = WorkspaceEngine.update_invoice(invoice_id, data, user_id=user_id)
    await _invalidate_dashboard_cache(_resolve_company_id(current_user))
    return result

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "SALES")),
):
    result = WorkspaceEngine.delete_invoice(invoice_id, user_id=current_user.get("id", 1))
    await _invalidate_dashboard_cache(_resolve_company_id(current_user))
    return result


# --- CUSTOMERS ---
@router.get("/customers")
async def get_customers(current_user: dict = Depends(get_current_user)):
    company_id = _resolve_company_id(current_user)
    try:
        return WorkspaceEngine.get_customers(company_id=company_id)
    except Exception:
        return []

@router.post("/customers")
async def add_customer(
    data: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "SALES", "FINANCE")),
):
    data["company_id"] = _resolve_company_id(current_user)
    data["user_id"] = current_user.get("id") or 1
    result = WorkspaceEngine.add_customer(data)
    await _invalidate_dashboard_cache(_resolve_company_id(current_user))
    return result

@router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: int,
    data: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "SALES", "FINANCE")),
):
    company_id = _resolve_company_id(current_user)
    result = WorkspaceEngine.update_customer(customer_id, data, company_id=company_id)
    await _invalidate_dashboard_cache(company_id)
    return result

@router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: int,
    current_user: dict = Depends(require_user_roles("ADMIN", "SALES", "FINANCE")),
):
    company_id = _resolve_company_id(current_user)
    result = WorkspaceEngine.delete_customer(customer_id, company_id=company_id)
    await _invalidate_dashboard_cache(company_id)
    return result


# --- INVENTORY ---
@router.get("/inventory")
async def get_inventory(current_user: dict = Depends(get_current_user)):
    company_id = _resolve_company_id(current_user)
    try:
        return WorkspaceEngine.get_inventory(company_id=company_id)
    except Exception:
        return []

@router.get("/inventory/health")
async def get_inventory_health(current_user: dict = Depends(get_current_user)):
    company_id = _resolve_company_id(current_user)
    return WorkspaceEngine.get_inventory_health(company_id=company_id)

@router.post("/inventory")
async def add_inventory_item(
    data: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "WAREHOUSE")),
):
    data["company_id"] = _resolve_company_id(current_user)
    data["user_id"] = current_user.get("id") or 1
    result = WorkspaceEngine.add_inventory_item(data)
    await _invalidate_dashboard_cache(_resolve_company_id(current_user))
    return result

@router.put("/inventory/{item_id}")
async def update_inventory_item(
    item_id: int,
    data: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "WAREHOUSE")),
):
    company_id = _resolve_company_id(current_user)
    result = WorkspaceEngine.update_inventory_item(item_id, data, company_id=company_id)
    await _invalidate_dashboard_cache(company_id)
    return result

@router.delete("/inventory/{item_id}")
async def delete_inventory_item(
    item_id: int,
    current_user: dict = Depends(require_user_roles("ADMIN", "WAREHOUSE")),
):
    company_id = _resolve_company_id(current_user)
    result = WorkspaceEngine.delete_inventory_item(item_id, company_id=company_id)
    await _invalidate_dashboard_cache(company_id)
    return result


# --- EXPENSES ---
@router.get("/expenses")
async def get_expenses(current_user: dict = Depends(get_current_user)):
    company_id = _resolve_company_id(current_user)
    return WorkspaceEngine.get_expenses(company_id=company_id)

@router.post("/expenses")
async def add_expense(
    data: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE")),
):
    data["company_id"] = _resolve_company_id(current_user)
    data["user_id"] = current_user.get("id") or 1
    result = WorkspaceEngine.add_expense(data)
    await _invalidate_dashboard_cache(_resolve_company_id(current_user))
    return result

@router.put("/expenses/{expense_id}")
async def update_expense(
    expense_id: int,
    data: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE")),
):
    company_id = _resolve_company_id(current_user)
    result = WorkspaceEngine.update_expense(expense_id, data, company_id=company_id)
    await _invalidate_dashboard_cache(company_id)
    return result

@router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE")),
):
    company_id = _resolve_company_id(current_user)
    result = WorkspaceEngine.delete_expense(expense_id, company_id=company_id)
    await _invalidate_dashboard_cache(company_id)
    return result


@router.get("/user/state")
async def get_user_state(current_user: dict = Depends(get_current_user)):
    """
    Retrieve user's operational state (UI preferences, active section, filters, dashboard settings, etc).
    Allows users to resume their workspace from where they left off.
    """
    user_id = current_user.get("id", 1)
    try:
        state = WorkspaceEngine.manage_user_state(user_id, "GET")
        return state or {}
    except Exception:
        return {}


@router.post("/user/state")
async def save_user_state(
    state: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Save user's operational state (UI preferences, active section, filters, dashboard settings, etc).
    Persists the state for future sessions to enable seamless workspace continuity.
    """
    user_id = current_user.get("id", 1)
    try:
        result = WorkspaceEngine.manage_user_state(user_id, "SAVE", state)
        return result
    except Exception:
        return {"status": "ignored", "reason": "state_store_unavailable"}


@router.get("/hr/employees")
async def get_hr_employees(current_user: dict = Depends(get_current_user)):
    """Primary HR list endpoint for frontend compatibility."""
    company_id = _resolve_company_id(current_user)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT * FROM employees WHERE company_id = ? ORDER BY created_at DESC",
            (company_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []
    finally:
        conn.close()


@router.get("/hr/stats")
async def get_hr_stats(current_user: dict = Depends(get_current_user)):
    """Primary HR stats endpoint for frontend compatibility."""
    company_id = _resolve_company_id(current_user)
    conn = sqlite3.connect(DB_PATH)
    try:
        total = conn.execute(
            "SELECT COUNT(*) FROM employees WHERE company_id = ?",
            (company_id,),
        ).fetchone()
        total_employees = int((total[0] if total else 0) or 0)
        dept_rows = conn.execute(
            "SELECT COALESCE(department, 'Unassigned') as department, COUNT(*) as count FROM employees WHERE company_id = ? GROUP BY COALESCE(department, 'Unassigned')",
            (company_id,),
        ).fetchall()
        dept_distribution = {str(r[0]): int(r[1]) for r in dept_rows}
        return {
            "total_employees": total_employees,
            "active": total_employees,
            "active_count": total_employees,
            "on_leave": 0,
            "terminated": 0,
            "avg_salary": 0,
            "dept_distribution": dept_distribution,
        }
    except Exception:
        return {
            "total_employees": 0,
            "active": 0,
            "active_count": 0,
            "on_leave": 0,
            "terminated": 0,
            "avg_salary": 0,
            "dept_distribution": {},
        }
    finally:
        conn.close()
