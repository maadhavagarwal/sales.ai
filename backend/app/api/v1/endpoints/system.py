from fastapi import APIRouter, Depends, Body, Request, HTTPException, BackgroundTasks
from typing import Any, Dict, List
import time
import os
import sqlite3
import io
import csv
import psutil
from datetime import datetime, timedelta
import hashlib
from app.api.v1.deps import (
    get_current_user,
    get_current_entitlements,
    require_features,
    require_org_roles,
    get_current_org,
    require_user_roles,
)
from app.services.billing_service import BillingService
from app.services.integration_service import IntegrationService
import json
import uuid
from app.core.cutover_gate import run_cutover_checks
from app.core.adoption_readiness import (
    build_go_live_confidence_report,
    get_incident_readiness,
    run_backup_restore_drill,
    run_data_parity_check,
    evaluate_migration_verification,
)
from app.core.system_readiness import evaluate_full_system_readiness
from app.core.database_manager import DB_PATH
from fastapi.responses import StreamingResponse
from app.services.monitoring import health_monitor

router = APIRouter()
ALLOWED_TEAM_ROLES = {"ADMIN", "FINANCE", "SALES", "WAREHOUSE", "HR", "ANALYST", "VIEWER"}
PLAN_SEAT_LIMITS = {
    "FREE": 3,
    "PRO": 15,
    "ENTERPRISE": 200,
}
PLAN_MONTHLY_PRICE_INR = {
    "FREE": 0,
    "PRO": 4999,
    "ENTERPRISE": 14999,
}


def _count(conn: sqlite3.Connection, table: str, company_id: str) -> int:
    row = conn.execute(
        f"SELECT COUNT(*) as c FROM {table} WHERE company_id = ?",
        (company_id,),
    ).fetchone()
    return int((row[0] if row else 0) or 0)


def _ensure_invites_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS org_invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            invited_by INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    try:
        conn.execute("ALTER TABLE org_invites ADD COLUMN invite_token TEXT")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE org_invites ADD COLUMN expires_at TEXT")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE org_invites ADD COLUMN used_at TEXT")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE org_invites ADD COLUMN revoked_at TEXT")
    except Exception:
        pass


def _ensure_billing_events_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL,
            actor_email TEXT,
            event_type TEXT NOT NULL,
            status TEXT NOT NULL,
            details_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _ensure_billing_subscriptions_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL UNIQUE,
            provider TEXT NOT NULL DEFAULT 'RAZORPAY',
            provider_customer_id TEXT,
            provider_subscription_id TEXT,
            plan_code TEXT NOT NULL DEFAULT 'FREE',
            lifecycle_status TEXT NOT NULL DEFAULT 'INACTIVE',
            status_reason TEXT,
            grace_ends_at TEXT,
            current_period_end TEXT,
            canceled_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _ensure_billing_invoices_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            company_id TEXT NOT NULL,
            billing_event_id INTEGER,
            event_type TEXT NOT NULL,
            tax_regime TEXT NOT NULL DEFAULT 'GST',
            currency TEXT NOT NULL DEFAULT 'INR',
            subtotal_inr INTEGER NOT NULL DEFAULT 0,
            gst_rate REAL NOT NULL DEFAULT 0,
            gst_amount_inr INTEGER NOT NULL DEFAULT 0,
            cgst_inr INTEGER NOT NULL DEFAULT 0,
            sgst_inr INTEGER NOT NULL DEFAULT 0,
            igst_inr INTEGER NOT NULL DEFAULT 0,
            total_inr INTEGER NOT NULL DEFAULT 0,
            seller_name TEXT,
            seller_gstin TEXT,
            buyer_name TEXT,
            buyer_gstin TEXT,
            billing_address TEXT,
            place_of_supply TEXT,
            compliance_hash TEXT,
            status TEXT NOT NULL DEFAULT 'ISSUED',
            details_json TEXT,
            issued_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _ensure_analytics_jobs_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS analytics_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL,
            submitted_by TEXT,
            job_type TEXT NOT NULL,
            payload_json TEXT,
            status TEXT NOT NULL DEFAULT 'QUEUED',
            attempts INTEGER NOT NULL DEFAULT 0,
            result_json TEXT,
            error_message TEXT,
            queued_at TEXT DEFAULT CURRENT_TIMESTAMP,
            started_at TEXT,
            completed_at TEXT
        )
        """
    )


def _ensure_backup_drills_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS backup_drills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL,
            initiated_by TEXT,
            status TEXT NOT NULL,
            summary_json TEXT,
            evidence_hash TEXT,
            executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _ensure_data_lineage_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS data_lineage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_ref TEXT,
            transform_stage TEXT NOT NULL,
            output_ref TEXT,
            metadata_json TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _ensure_model_versions_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS model_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL,
            model_name TEXT NOT NULL,
            version_tag TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            notes TEXT,
            metadata_json TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _append_billing_event(
    company_id: str,
    actor_email: str | None,
    event_type: str,
    status: str,
    details_json: str,
) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_billing_events_table(conn)
        conn.execute(
            """
            INSERT INTO billing_events (company_id, actor_email, event_type, status, details_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (company_id, actor_email, event_type, status, details_json),
        )
        conn.commit()
    finally:
        conn.close()


def _append_admin_audit(
    user_id: int,
    company_id: str,
    action: str,
    module: str,
    entity_id: str | None = None,
    details: dict | None = None,
) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT INTO audit_logs (user_id, company_id, action, module, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (int(user_id or 0), company_id, action, module, entity_id, json.dumps(details or {})),
        )
        conn.commit()
    finally:
        conn.close()


def _get_plan_for_company(conn: sqlite3.Connection, company_id: str) -> str:
    row = conn.execute(
        "SELECT subscription_plan FROM organizations WHERE uuid = ?",
        (company_id,),
    ).fetchone()
    return str((row[0] if row else "FREE") or "FREE").upper()


def _get_company_settings_json(conn: sqlite3.Connection, company_id: str) -> dict:
    row = conn.execute(
        "SELECT details_json FROM company_profiles WHERE id = ?",
        (company_id,),
    ).fetchone()
    if not row or not row[0]:
        return {}
    try:
        parsed = json.loads(row[0])
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _resolve_seat_limit(conn: sqlite3.Connection, company_id: str) -> int:
    settings = _get_company_settings_json(conn, company_id)
    plan = _get_plan_for_company(conn, company_id)
    default_limit = PLAN_SEAT_LIMITS.get(plan, PLAN_SEAT_LIMITS["FREE"])
    raw = settings.get("seat_limit")
    if raw is None:
        return int(default_limit)
    try:
        return max(1, int(raw))
    except Exception:
        return int(default_limit)


def _resolve_seat_limit_from_details(details_json: dict, plan: str) -> int:
    default_limit = PLAN_SEAT_LIMITS.get(str(plan or "FREE").upper(), PLAN_SEAT_LIMITS["FREE"])
    raw = details_json.get("seat_limit")
    if raw is None:
        return int(default_limit)
    try:
        return max(1, int(raw))
    except Exception:
        return int(default_limit)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except Exception:
        return None


def _resolve_plan_price(plan_code: str) -> int:
    return int(PLAN_MONTHLY_PRICE_INR.get(str(plan_code or "FREE").upper(), 0))


def _estimate_event_subtotal_inr(event_type: str, details: dict) -> int:
    candidates = [
        details.get("amount_inr"),
        details.get("proration_delta_inr"),
        details.get("amount"),
    ]
    for raw in candidates:
        try:
            parsed = int(round(float(raw)))
            if parsed > 0:
                return parsed
        except Exception:
            continue

    to_plan = str(details.get("to_plan") or details.get("plan") or "").upper()
    if to_plan in PLAN_MONTHLY_PRICE_INR:
        return _resolve_plan_price(to_plan)
    if event_type in {"PAYMENT_SUCCESS", "RENEWAL_SUCCESS"}:
        return _resolve_plan_price("PRO")
    return 0


def _build_billing_invoice_text(invoice: dict) -> str:
    return (
        f"NeuralBI Tax Invoice\n"
        f"Invoice No: {invoice.get('invoice_number')}\n"
        f"Issued At: {invoice.get('issued_at')}\n"
        f"Company ID: {invoice.get('company_id')}\n"
        f"Event: {invoice.get('event_type')}\n"
        f"Seller: {invoice.get('seller_name', 'NeuralBI')}\n"
        f"Seller GSTIN: {invoice.get('seller_gstin', '')}\n"
        f"Buyer: {invoice.get('buyer_name', 'Organization')}\n"
        f"Buyer GSTIN: {invoice.get('buyer_gstin', '')}\n"
        f"Address: {invoice.get('billing_address', '')}\n"
        f"Place Of Supply: {invoice.get('place_of_supply', '')}\n"
        f"Subtotal (INR): {invoice.get('subtotal_inr', 0)}\n"
        f"GST Rate: {invoice.get('gst_rate', 0)}%\n"
        f"CGST (INR): {invoice.get('cgst_inr', 0)}\n"
        f"SGST (INR): {invoice.get('sgst_inr', 0)}\n"
        f"IGST (INR): {invoice.get('igst_inr', 0)}\n"
        f"GST Total (INR): {invoice.get('gst_amount_inr', 0)}\n"
        f"Total (INR): {invoice.get('total_inr', 0)}\n"
        f"Compliance Hash: {invoice.get('compliance_hash', '')}\n"
        f"Status: {invoice.get('status', 'ISSUED')}\n"
    )


def _run_analytics_job(job_id: int) -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_analytics_jobs_table(conn)
        _ensure_data_lineage_table(conn)
        row = conn.execute(
            "SELECT id, company_id, job_type, payload_json, attempts FROM analytics_jobs WHERE id = ?",
            (job_id,),
        ).fetchone()
        if not row:
            return

        company_id = str(row["company_id"] or "DEFAULT")
        job_type = str(row["job_type"] or "summary_rollup")
        attempts = int(row["attempts"] or 0) + 1

        conn.execute(
            "UPDATE analytics_jobs SET status = 'RUNNING', attempts = ?, started_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = ?",
            (attempts, job_id),
        )
        conn.commit()

        try:
            if job_type == "summary_rollup":
                total_revenue = conn.execute(
                    "SELECT COALESCE(SUM(grand_total), 0) FROM invoices WHERE company_id = ?",
                    (company_id,),
                ).fetchone()[0]
                outstanding = conn.execute(
                    "SELECT COALESCE(SUM(grand_total), 0) FROM invoices WHERE company_id = ? AND UPPER(COALESCE(status, '')) != 'PAID'",
                    (company_id,),
                ).fetchone()[0]
                customers = conn.execute(
                    "SELECT COUNT(*) FROM customers WHERE company_id = ?",
                    (company_id,),
                ).fetchone()[0]
                expenses = conn.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE company_id = ?",
                    (company_id,),
                ).fetchone()[0]
                result = {
                    "job_type": job_type,
                    "company_id": company_id,
                    "kpis": {
                        "revenue_total": float(total_revenue or 0),
                        "receivables_outstanding": float(outstanding or 0),
                        "customer_count": int(customers or 0),
                        "expense_total": float(expenses or 0),
                    },
                }
            elif job_type == "monthly_revenue":
                rows = conn.execute(
                    """
                    SELECT substr(COALESCE(date, created_at), 1, 7) AS month, COALESCE(SUM(grand_total), 0) AS revenue
                    FROM invoices
                    WHERE company_id = ?
                    GROUP BY month
                    ORDER BY month DESC
                    LIMIT 12
                    """,
                    (company_id,),
                ).fetchall()
                result = {
                    "job_type": job_type,
                    "company_id": company_id,
                    "series": [{"month": r["month"], "revenue": float(r["revenue"] or 0)} for r in rows],
                }
            else:
                result = {
                    "job_type": job_type,
                    "company_id": company_id,
                    "note": "Unsupported job type, defaulted to metadata-only result",
                }

            conn.execute(
                """
                UPDATE analytics_jobs
                SET status = 'COMPLETED', result_json = ?, completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (json.dumps(result), job_id),
            )
            conn.execute(
                """
                INSERT INTO data_lineage (company_id, source_type, source_ref, transform_stage, output_ref, metadata_json, created_by)
                VALUES (?, 'ANALYTICS_JOB', ?, 'AGGREGATION', ?, ?, 'system')
                """,
                (
                    company_id,
                    str(job_id),
                    f"analytics_result:{job_id}",
                    json.dumps({"job_type": job_type, "status": "COMPLETED"}),
                ),
            )
            conn.commit()
        except Exception as e:
            conn.execute(
                """
                UPDATE analytics_jobs
                SET status = 'FAILED', error_message = ?, completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (str(e), job_id),
            )
            conn.execute(
                """
                INSERT INTO data_lineage (company_id, source_type, source_ref, transform_stage, output_ref, metadata_json, created_by)
                VALUES (?, 'ANALYTICS_JOB', ?, 'FAILED', ?, ?, 'system')
                """,
                (
                    company_id,
                    str(job_id),
                    f"analytics_result:{job_id}",
                    json.dumps({"job_type": job_type, "status": "FAILED", "error": str(e)}),
                ),
            )
            conn.commit()
    finally:
        conn.close()


def _get_seat_usage(
    conn: sqlite3.Connection,
    company_id: str,
    exclude_pending_invite_id: int | None = None,
) -> dict:
    active_row = conn.execute(
        "SELECT COUNT(*) FROM users WHERE company_id = ?",
        (company_id,),
    ).fetchone()
    if exclude_pending_invite_id is None:
        pending_row = conn.execute(
            """
            SELECT COUNT(*) FROM org_invites
            WHERE company_id = ? AND status = 'PENDING'
            """,
            (company_id,),
        ).fetchone()
    else:
        pending_row = conn.execute(
            """
            SELECT COUNT(*) FROM org_invites
            WHERE company_id = ? AND status = 'PENDING' AND id != ?
            """,
            (company_id, int(exclude_pending_invite_id)),
        ).fetchone()

    active_users = int((active_row[0] if active_row else 0) or 0)
    pending_invites = int((pending_row[0] if pending_row else 0) or 0)
    seat_limit = _resolve_seat_limit(conn, company_id)
    used_total = active_users + pending_invites
    return {
        "seat_limit": seat_limit,
        "active_users": active_users,
        "pending_invites": pending_invites,
        "used_total": used_total,
        "available": max(0, seat_limit - used_total),
        "over_limit": used_total > seat_limit,
    }


@router.get("/entitlements")
async def get_entitlements(
    current_user: dict = Depends(get_current_user),
    entitlements: dict = Depends(get_current_entitlements),
):
    """Current subscription capabilities for UI and API feature gating."""
    return {
        "company_id": entitlements.get("company_id") or current_user.get("company_id"),
        "plan": entitlements.get("plan", "FREE"),
        "status": entitlements.get("status", "ACTIVE"),
        "features": entitlements.get("features", []),
    }


@router.get("/organization/summary")
async def get_organization_summary(current_user: dict = Depends(get_current_user)):
    """Tenant-level operations summary for SaaS admin console surfaces."""
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    try:
        profile = conn.execute(
            "SELECT id, name, industry, hq_location FROM company_profiles WHERE id = ?",
            (company_id,),
        ).fetchone()

        users_row = conn.execute(
            "SELECT COUNT(*) FROM users WHERE company_id = ?",
            (company_id,),
        ).fetchone()

        counts = {
            "users": int((users_row[0] if users_row else 0) or 0),
            "customers": _count(conn, "customers", company_id),
            "invoices": _count(conn, "invoices", company_id),
            "inventory": _count(conn, "inventory", company_id),
            "expenses": _count(conn, "expenses", company_id),
            "segments": _count(conn, "segments", company_id),
        }

        checklist = {
            "profile_configured": bool(profile and profile[1]),
            "data_uploaded": (counts["invoices"] + counts["customers"] + counts["inventory"] + counts["expenses"]) > 0,
            "finance_ready": counts["expenses"] > 0,
            "segment_ready": counts["segments"] > 0,
            "team_ready": counts["users"] > 0,
        }

        checklist_score = int(round((sum(1 for v in checklist.values() if v) / len(checklist)) * 100))

        modules = {
            "dashboard": {
                "status": "ready" if checklist["data_uploaded"] else "pending",
                "records": counts["invoices"] + counts["customers"] + counts["inventory"] + counts["expenses"],
            },
            "expenses": {
                "status": "ready" if counts["expenses"] > 0 else "pending",
                "records": counts["expenses"],
            },
            "gst": {
                "status": "ready" if counts["expenses"] > 0 else "pending",
                "records": counts["expenses"],
            },
            "segments": {
                "status": "ready" if counts["segments"] > 0 else "pending",
                "records": counts["segments"],
            },
        }

        return {
            "company_id": company_id,
            "company_name": (profile[1] if profile else None) or "Enterprise Organization",
            "industry": (profile[2] if profile else None) or "Unknown",
            "hq_location": (profile[3] if profile else None) or "Unknown",
            "counts": counts,
            "checklist": checklist,
            "checklist_score": checklist_score,
            "modules": modules,
        }
    finally:
        conn.close()


@router.get("/organization/users")
async def get_organization_users(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT id, email, role, created_at
            FROM users
            WHERE company_id = ?
            ORDER BY created_at ASC
            """,
            (company_id,),
        ).fetchall()
        return {
            "company_id": company_id,
            "users": [dict(r) for r in rows],
            "count": len(rows),
        }
    finally:
        conn.close()


@router.put("/organization/users/{user_id}/role")
async def update_organization_user_role(
    user_id: int,
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    new_role = str(payload.get("role") or "").upper()
    if new_role not in ALLOWED_TEAM_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    company_id = current_user.get("company_id") or "DEFAULT"
    requester_id = int(current_user.get("id") or 0)
    if requester_id == user_id and new_role != "ADMIN":
        raise HTTPException(status_code=400, detail="Self role downgrade is blocked")

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT id FROM users WHERE id = ? AND company_id = ?",
            (user_id, company_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found in organization")

        conn.execute(
            "UPDATE users SET role = ? WHERE id = ? AND company_id = ?",
            (new_role, user_id, company_id),
        )
        conn.commit()
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=company_id,
            action="UPDATE_USER_ROLE",
            module="TEAM_ADMIN",
            entity_id=str(user_id),
            details={"new_role": new_role},
        )
        return {"status": "success", "user_id": user_id, "role": new_role}
    finally:
        conn.close()


@router.get("/organization/invites")
async def get_organization_invites(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_invites_table(conn)
        rows = conn.execute(
            """
            SELECT id, email, role, status, invited_by, created_at, expires_at, used_at, revoked_at
            FROM org_invites
            WHERE company_id = ?
            ORDER BY created_at DESC
            """,
            (company_id,),
        ).fetchall()
        return {"invites": [dict(r) for r in rows], "count": len(rows)}
    finally:
        conn.close()


@router.post("/organization/invites")
async def invite_organization_user(
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    email = str(payload.get("email") or "").strip().lower()
    role = str(payload.get("role") or "VIEWER").upper()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    if role not in ALLOWED_TEAM_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    company_id = current_user.get("company_id") or "DEFAULT"
    invited_by = int(current_user.get("id") or 0)
    invite_token = f"{uuid.uuid4().hex}{uuid.uuid4().hex}"
    expires_at = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")

    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_invites_table(conn)
        seat_usage = _get_seat_usage(conn, company_id)
        if seat_usage["available"] <= 0:
            _append_admin_audit(
                user_id=invited_by,
                company_id=company_id,
                action="INVITE_BLOCKED_SEAT_LIMIT",
                module="TEAM_ADMIN",
                entity_id=email,
                details={"seat_usage": seat_usage},
            )
            raise HTTPException(status_code=402, detail="Seat limit reached for current plan")

        conn.execute(
            """
            INSERT INTO org_invites (company_id, email, role, status, invited_by, invite_token, expires_at)
            VALUES (?, ?, ?, 'PENDING', ?, ?, ?)
            """,
            (company_id, email, role, invited_by, invite_token, expires_at),
        )
        conn.commit()
        _append_admin_audit(
            user_id=invited_by,
            company_id=company_id,
            action="CREATE_INVITE",
            module="TEAM_ADMIN",
            entity_id=email,
            details={"role": role},
        )
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        invite_link = f"{frontend_url}/login?invite_token={invite_token}"
        IntegrationService.send_email(
            to_email=email,
            subject="You're invited to NeuralBI Organization",
            body=f"You have been invited as {role}. Sign in and accept: {invite_link}",
        )
        return {"status": "success", "email": email, "role": role, "expires_at": expires_at}
    finally:
        conn.close()


@router.post("/organization/invites/{invite_id}/revoke")
async def revoke_organization_invite(
    invite_id: int,
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    actor_id = int(current_user.get("id") or 0)
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_invites_table(conn)
        row = conn.execute(
            "SELECT id, status, email FROM org_invites WHERE id = ? AND company_id = ?",
            (invite_id, company_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invite not found")
        current_status = str(row[1]).upper()
        if current_status not in {"PENDING", "EXPIRED"}:
            raise HTTPException(status_code=400, detail="Only pending/expired invites can be revoked")
        conn.execute(
            "UPDATE org_invites SET status = 'REVOKED', invite_token = NULL, revoked_at = ? WHERE id = ?",
            (datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), invite_id),
        )
        conn.commit()
        _append_admin_audit(
            user_id=actor_id,
            company_id=company_id,
            action="REVOKE_INVITE",
            module="TEAM_ADMIN",
            entity_id=str(invite_id),
            details={"email": row[2]},
        )
        return {"status": "success"}
    finally:
        conn.close()


@router.post("/organization/invites/{invite_id}/accept")
async def accept_organization_invite(
    invite_id: int,
    current_user: dict = Depends(get_current_user),
):
    user_email = str(current_user.get("email") or "").strip().lower()
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_invites_table(conn)
        invite = conn.execute(
            """
            SELECT id, company_id, email, role, status, expires_at
            FROM org_invites
            WHERE id = ?
            """,
            (invite_id,),
        ).fetchone()
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        if str(invite["email"]).lower() != user_email:
            raise HTTPException(status_code=403, detail="Invite email does not match current user")
        invite_status = str(invite["status"]).upper()
        if invite_status != "PENDING":
            _append_admin_audit(
                user_id=int(current_user.get("id") or 0),
                company_id=str(invite["company_id"]),
                action="INVITE_TOKEN_REPLAY",
                module="TEAM_ADMIN",
                entity_id=str(invite_id),
                details={"email": user_email, "status": invite_status, "method": "id_accept"},
            )
            raise HTTPException(status_code=400, detail="Invite already processed")
        if invite["expires_at"]:
            try:
                expires_at = datetime.strptime(str(invite["expires_at"]), "%Y-%m-%dT%H:%M:%SZ")
                if datetime.utcnow() > expires_at:
                    conn.execute("UPDATE org_invites SET status = 'EXPIRED' WHERE id = ?", (invite_id,))
                    conn.commit()
                    raise HTTPException(status_code=400, detail="Invite has expired")
            except ValueError:
                pass

        _ensure_invites_table(conn)
        seat_usage = _get_seat_usage(conn, str(invite["company_id"]), exclude_pending_invite_id=int(invite_id))
        if seat_usage["available"] <= 0:
            _append_admin_audit(
                user_id=int(current_user.get("id") or 0),
                company_id=str(invite["company_id"]),
                action="INVITE_ACCEPT_BLOCKED_SEAT_LIMIT",
                module="TEAM_ADMIN",
                entity_id=str(invite_id),
                details={"email": user_email, "seat_usage": seat_usage},
            )
            raise HTTPException(status_code=402, detail="Seat limit reached for current plan")

        conn.execute(
            "UPDATE users SET company_id = ?, role = ? WHERE email = ?",
            (invite["company_id"], str(invite["role"]).upper(), user_email),
        )
        conn.execute(
            "UPDATE org_invites SET status = 'ACCEPTED', invite_token = NULL, used_at = ? WHERE id = ?",
            (datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), invite_id),
        )
        conn.commit()
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=str(invite["company_id"]),
            action="ACCEPT_INVITE",
            module="TEAM_ADMIN",
            entity_id=str(invite_id),
            details={"email": user_email, "role": str(invite["role"]).upper()},
        )
        return {
            "status": "success",
            "company_id": invite["company_id"],
            "role": str(invite["role"]).upper(),
        }
    finally:
        conn.close()


@router.post("/organization/invites/accept-token")
async def accept_organization_invite_by_token(
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    invite_token = str(payload.get("invite_token") or "").strip()
    user_email = str(current_user.get("email") or "").strip().lower()
    if not invite_token:
        raise HTTPException(status_code=400, detail="Invite token is required")
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_invites_table(conn)
        invite = conn.execute(
            """
            SELECT id, company_id, email, role, status, expires_at
            FROM org_invites
            WHERE invite_token = ?
            """,
            (invite_token,),
        ).fetchone()
        if not invite:
            _append_admin_audit(
                user_id=int(current_user.get("id") or 0),
                company_id=str(current_user.get("company_id") or "UNKNOWN"),
                action="INVITE_TOKEN_INVALID",
                module="TEAM_ADMIN",
                details={"email": user_email, "method": "token_accept"},
            )
            raise HTTPException(status_code=404, detail="Invalid invite token")
        if str(invite["email"]).lower() != user_email:
            raise HTTPException(status_code=403, detail="Invite email does not match current user")
        invite_status = str(invite["status"]).upper()
        if invite_status != "PENDING":
            _append_admin_audit(
                user_id=int(current_user.get("id") or 0),
                company_id=str(invite["company_id"]),
                action="INVITE_TOKEN_REPLAY",
                module="TEAM_ADMIN",
                entity_id=str(invite["id"]),
                details={"email": user_email, "status": invite_status, "method": "token_accept"},
            )
            raise HTTPException(status_code=400, detail="Invite already processed")
        if invite["expires_at"]:
            try:
                expires_at = datetime.strptime(str(invite["expires_at"]), "%Y-%m-%dT%H:%M:%SZ")
                if datetime.utcnow() > expires_at:
                    conn.execute("UPDATE org_invites SET status = 'EXPIRED' WHERE id = ?", (invite["id"],))
                    conn.commit()
                    raise HTTPException(status_code=400, detail="Invite has expired")
            except ValueError:
                pass

        _ensure_invites_table(conn)
        seat_usage = _get_seat_usage(conn, str(invite["company_id"]), exclude_pending_invite_id=int(invite["id"]))
        if seat_usage["available"] <= 0:
            _append_admin_audit(
                user_id=int(current_user.get("id") or 0),
                company_id=str(invite["company_id"]),
                action="INVITE_ACCEPT_TOKEN_BLOCKED_SEAT_LIMIT",
                module="TEAM_ADMIN",
                entity_id=str(invite["id"]),
                details={"email": user_email, "seat_usage": seat_usage},
            )
            raise HTTPException(status_code=402, detail="Seat limit reached for current plan")

        conn.execute(
            "UPDATE users SET company_id = ?, role = ? WHERE email = ?",
            (invite["company_id"], str(invite["role"]).upper(), user_email),
        )
        conn.execute(
            "UPDATE org_invites SET status = 'ACCEPTED', invite_token = NULL, used_at = ? WHERE id = ?",
            (datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), invite["id"]),
        )
        conn.commit()
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=str(invite["company_id"]),
            action="ACCEPT_INVITE_TOKEN",
            module="TEAM_ADMIN",
            entity_id=str(invite["id"]),
            details={"email": user_email},
        )
        return {"status": "success", "company_id": invite["company_id"], "role": str(invite["role"]).upper()}
    finally:
        conn.close()


@router.get("/organization/users/{user_id}/security")
async def get_organization_user_security(
    user_id: int,
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT id, email, idle_timeout, allowed_ips, mfa_enabled FROM users WHERE id = ? AND company_id = ?",
            (user_id, company_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found in organization")
        allowed_ips: List[str] = []
        raw = row["allowed_ips"]
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    allowed_ips = [str(ip) for ip in parsed if str(ip).strip()]
            except Exception:
                allowed_ips = [s.strip() for s in str(raw).split(",") if s.strip()]
        return {
            "user_id": row["id"],
            "email": row["email"],
            "idle_timeout": int(row["idle_timeout"] or 3600),
            "mfa_enabled": bool(int(row["mfa_enabled"] or 0)),
            "allowed_ips": allowed_ips,
        }
    finally:
        conn.close()


@router.put("/organization/users/{user_id}/security")
async def update_organization_user_security(
    user_id: int,
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    idle_timeout = int(payload.get("idle_timeout", 3600))
    idle_timeout = max(300, min(idle_timeout, 86400))
    mfa_enabled = bool(payload.get("mfa_enabled", False))

    allowed_ips_input = payload.get("allowed_ips", [])
    if isinstance(allowed_ips_input, str):
        allowed_ips = [ip.strip() for ip in allowed_ips_input.split(",") if ip.strip()]
    elif isinstance(allowed_ips_input, list):
        allowed_ips = [str(ip).strip() for ip in allowed_ips_input if str(ip).strip()]
    else:
        allowed_ips = []

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT id FROM users WHERE id = ? AND company_id = ?",
            (user_id, company_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found in organization")

        conn.execute(
            "UPDATE users SET idle_timeout = ?, allowed_ips = ?, mfa_enabled = ? WHERE id = ? AND company_id = ?",
            (idle_timeout, json.dumps(allowed_ips), 1 if mfa_enabled else 0, user_id, company_id),
        )
        conn.commit()
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=company_id,
            action="UPDATE_USER_SECURITY",
            module="SECURITY",
            entity_id=str(user_id),
            details={"idle_timeout": idle_timeout, "allowed_ips_count": len(allowed_ips), "mfa_enabled": mfa_enabled},
        )
        return {"status": "success"}
    finally:
        conn.close()


@router.get("/billing/history")
async def get_billing_history(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_events_table(conn)
        rows = conn.execute(
            """
            SELECT id, actor_email, event_type, status, details_json, created_at
            FROM billing_events
            WHERE company_id = ?
            ORDER BY created_at DESC
            LIMIT 30
            """,
            (company_id,),
        ).fetchall()
        events = []
        for r in rows:
            details = {}
            try:
                details = json.loads(r["details_json"] or "{}")
            except Exception:
                details = {}
            events.append(
                {
                    "id": r["id"],
                    "actor_email": r["actor_email"],
                    "event_type": r["event_type"],
                    "status": r["status"],
                    "details": details,
                    "created_at": r["created_at"],
                }
            )
        return {"events": events, "count": len(events)}
    finally:
        conn.close()


@router.get("/billing/subscription")
async def get_billing_subscription_state(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_subscriptions_table(conn)
        snapshot = conn.execute(
            """
            SELECT provider, provider_customer_id, provider_subscription_id, plan_code, lifecycle_status,
                   status_reason, grace_ends_at, current_period_end, canceled_at, updated_at
            FROM billing_subscriptions
            WHERE company_id = ?
            """,
            (company_id,),
        ).fetchone()

        if snapshot:
            return {
                "company_id": company_id,
                "provider": snapshot["provider"],
                "provider_customer_id": snapshot["provider_customer_id"],
                "provider_subscription_id": snapshot["provider_subscription_id"],
                "plan_code": snapshot["plan_code"],
                "lifecycle_status": snapshot["lifecycle_status"],
                "status_reason": snapshot["status_reason"],
                "grace_ends_at": snapshot["grace_ends_at"],
                "current_period_end": snapshot["current_period_end"],
                "canceled_at": snapshot["canceled_at"],
                "updated_at": snapshot["updated_at"],
            }

        org_row = conn.execute(
            "SELECT subscription_plan, subscription_status FROM organizations WHERE uuid = ?",
            (company_id,),
        ).fetchone()
        plan_code = str((org_row[0] if org_row else "FREE") or "FREE").upper()
        lifecycle_status = str((org_row[1] if org_row else "INACTIVE") or "INACTIVE").upper()
        return {
            "company_id": company_id,
            "provider": "RAZORPAY",
            "provider_customer_id": None,
            "provider_subscription_id": None,
            "plan_code": plan_code,
            "lifecycle_status": lifecycle_status,
            "status_reason": "snapshot_not_initialized",
            "grace_ends_at": None,
            "current_period_end": None,
            "canceled_at": None,
            "updated_at": None,
        }
    finally:
        conn.close()


@router.get("/billing/proration-quote")
async def get_billing_proration_quote(
    target_plan: str,
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    requested_plan = str(target_plan or "").upper()
    if requested_plan not in PLAN_MONTHLY_PRICE_INR:
        raise HTTPException(status_code=400, detail="Invalid target plan")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_subscriptions_table(conn)
        snapshot = conn.execute(
            """
            SELECT plan_code, lifecycle_status, current_period_end
            FROM billing_subscriptions
            WHERE company_id = ?
            """,
            (company_id,),
        ).fetchone()
        if snapshot:
            current_plan = str(snapshot["plan_code"] or "FREE").upper()
            current_period_end = _parse_iso_datetime(snapshot["current_period_end"])
            lifecycle_status = str(snapshot["lifecycle_status"] or "INACTIVE").upper()
        else:
            org_row = conn.execute(
                "SELECT subscription_plan, subscription_status FROM organizations WHERE uuid = ?",
                (company_id,),
            ).fetchone()
            current_plan = str((org_row[0] if org_row else "FREE") or "FREE").upper()
            lifecycle_status = str((org_row[1] if org_row else "INACTIVE") or "INACTIVE").upper()
            current_period_end = None

        if current_plan == requested_plan:
            return {
                "company_id": company_id,
                "current_plan": current_plan,
                "target_plan": requested_plan,
                "proration_delta_inr": 0,
                "days_remaining": 0,
                "lifecycle_status": lifecycle_status,
                "note": "No change required",
            }

        now_utc = datetime.utcnow()
        days_remaining = 0
        if current_period_end:
            delta_days = (current_period_end.replace(tzinfo=None) - now_utc).days
            days_remaining = max(0, int(delta_days))

        current_price = _resolve_plan_price(current_plan)
        target_price = _resolve_plan_price(requested_plan)
        full_cycle_delta = target_price - current_price
        proration_ratio = min(1.0, max(0.0, days_remaining / 30.0))
        proration_delta = int(round(full_cycle_delta * proration_ratio))

        return {
            "company_id": company_id,
            "current_plan": current_plan,
            "target_plan": requested_plan,
            "current_price_inr": current_price,
            "target_price_inr": target_price,
            "proration_delta_inr": proration_delta,
            "days_remaining": days_remaining,
            "lifecycle_status": lifecycle_status,
        }
    finally:
        conn.close()


@router.post("/billing/plan-change")
async def apply_billing_plan_change(
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    target_plan = str(payload.get("target_plan") or "").upper()
    effective_mode = str(payload.get("effective_mode") or "IMMEDIATE").upper()
    reason = str(payload.get("reason") or "admin_plan_change").strip()

    if target_plan not in PLAN_MONTHLY_PRICE_INR:
        raise HTTPException(status_code=400, detail="Invalid target plan")
    if effective_mode not in {"IMMEDIATE", "PERIOD_END"}:
        raise HTTPException(status_code=400, detail="Invalid effective mode")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_subscriptions_table(conn)
        org_row = conn.execute(
            "SELECT subscription_plan, subscription_status FROM organizations WHERE uuid = ?",
            (company_id,),
        ).fetchone()
        current_plan = str((org_row[0] if org_row else "FREE") or "FREE").upper()
        current_status = str((org_row[1] if org_row else "INACTIVE") or "INACTIVE").upper()

        quote = await get_billing_proration_quote(target_plan=target_plan, current_user=current_user)
        proration_delta = int(quote.get("proration_delta_inr", 0))

        if effective_mode == "IMMEDIATE":
            conn.execute(
                "UPDATE organizations SET subscription_plan = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?",
                (target_plan, company_id),
            )
            conn.execute(
                """
                INSERT INTO billing_subscriptions (
                    company_id, plan_code, lifecycle_status, status_reason, updated_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(company_id) DO UPDATE SET
                    plan_code = excluded.plan_code,
                    lifecycle_status = excluded.lifecycle_status,
                    status_reason = excluded.status_reason,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (company_id, target_plan, current_status, f"PLAN_CHANGE_{effective_mode}"),
            )
            applied = True
            scheduled_for = None
        else:
            conn.execute(
                """
                INSERT INTO billing_subscriptions (
                    company_id, plan_code, lifecycle_status, status_reason, updated_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(company_id) DO UPDATE SET
                    status_reason = excluded.status_reason,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (company_id, current_plan, current_status, f"SCHEDULED_PLAN_CHANGE:{target_plan}"),
            )
            applied = False
            scheduled_for = "CURRENT_PERIOD_END"

        event_payload = {
            "from_plan": current_plan,
            "to_plan": target_plan,
            "effective_mode": effective_mode,
            "proration_delta_inr": proration_delta,
            "reason": reason,
            "scheduled_for": scheduled_for,
        }
        _append_billing_event(
            company_id=company_id,
            actor_email=str(current_user.get("email") or ""),
            event_type="PLAN_CHANGE",
            status="SUCCESS",
            details_json=json.dumps(event_payload),
        )
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=company_id,
            action="BILLING_PLAN_CHANGE",
            module="BILLING",
            details=event_payload,
        )

        conn.commit()
        return {
            "status": "success",
            "applied": applied,
            "current_plan": current_plan,
            "target_plan": target_plan,
            "effective_mode": effective_mode,
            "scheduled_for": scheduled_for,
            "proration_delta_inr": proration_delta,
        }
    finally:
        conn.close()


@router.post("/billing/refunds")
async def request_billing_refund(
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    amount_inr = int(payload.get("amount_inr", 0) or 0)
    reason = str(payload.get("reason") or "").strip()
    reference_event_id = payload.get("reference_event_id")

    if amount_inr <= 0:
        raise HTTPException(status_code=400, detail="Valid refund amount is required")
    if not reason:
        raise HTTPException(status_code=400, detail="Refund reason is required")

    details = {
        "amount_inr": amount_inr,
        "reason": reason,
        "reference_event_id": reference_event_id,
        "requested_by": str(current_user.get("email") or ""),
        "workflow_status": "REQUESTED",
    }
    _append_billing_event(
        company_id=company_id,
        actor_email=str(current_user.get("email") or ""),
        event_type="REFUND_REQUESTED",
        status="SUCCESS",
        details_json=json.dumps(details),
    )
    _append_admin_audit(
        user_id=int(current_user.get("id") or 0),
        company_id=company_id,
        action="BILLING_REFUND_REQUEST",
        module="BILLING",
        details=details,
    )

    return {"status": "success", "workflow_status": "REQUESTED", "amount_inr": amount_inr}


@router.post("/billing/invoices/generate")
async def generate_billing_invoice(
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    billing_event_id = int(payload.get("billing_event_id", 0) or 0)
    if billing_event_id <= 0:
        raise HTTPException(status_code=400, detail="billing_event_id is required")

    gst_rate = float(payload.get("gst_rate", 18) or 18)
    gst_rate = max(0.0, min(28.0, gst_rate))

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_events_table(conn)
        _ensure_billing_invoices_table(conn)
        event_row = conn.execute(
            """
            SELECT id, event_type, status, details_json, created_at
            FROM billing_events
            WHERE id = ? AND company_id = ?
            """,
            (billing_event_id, company_id),
        ).fetchone()
        if not event_row:
            raise HTTPException(status_code=404, detail="Billing event not found")

        existing = conn.execute(
            "SELECT invoice_number FROM billing_invoices WHERE company_id = ? AND billing_event_id = ?",
            (company_id, billing_event_id),
        ).fetchone()
        if existing:
            return {"status": "success", "invoice_number": existing[0], "already_exists": True}

        event_type = str(event_row["event_type"] or "UNKNOWN")
        details = {}
        try:
            details = json.loads(event_row["details_json"] or "{}")
        except Exception:
            details = {}

        subtotal_inr = _estimate_event_subtotal_inr(event_type, details)
        gst_amount = int(round(subtotal_inr * (gst_rate / 100.0)))
        total_inr = subtotal_inr + gst_amount

        profile = conn.execute(
            "SELECT name, gstin, hq_location FROM company_profiles WHERE id = ?",
            (company_id,),
        ).fetchone()
        buyer_name = str((profile[0] if profile else None) or "Enterprise Organization")
        buyer_gstin = str((profile[1] if profile else None) or "")
        place_of_supply = str((profile[2] if profile else None) or "IN")
        billing_address = str(payload.get("billing_address") or place_of_supply)

        seller_name = os.getenv("BILLING_LEGAL_ENTITY_NAME", "NeuralBI Technologies Pvt Ltd")
        seller_gstin = os.getenv("BUSINESS_GSTIN", "27AAAAA0000A1Z5")

        intra_state = bool(seller_gstin[:2] and buyer_gstin[:2] and seller_gstin[:2] == buyer_gstin[:2])
        cgst_inr = int(round(gst_amount / 2)) if intra_state else 0
        sgst_inr = gst_amount - cgst_inr if intra_state else 0
        igst_inr = 0 if intra_state else gst_amount

        invoice_number = f"NBI-BILL-{datetime.utcnow().strftime('%Y%m%d')}-{billing_event_id:06d}"
        hash_payload = f"{invoice_number}|{company_id}|{event_type}|{subtotal_inr}|{gst_amount}|{total_inr}|{buyer_gstin}|{seller_gstin}"
        compliance_hash = hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()

        invoice_details = {
            "billing_event_created_at": event_row["created_at"],
            "billing_event_status": event_row["status"],
            "source_details": details,
            "generated_by": str(current_user.get("email") or ""),
        }

        conn.execute(
            """
            INSERT INTO billing_invoices (
                invoice_number, company_id, billing_event_id, event_type, tax_regime, currency,
                subtotal_inr, gst_rate, gst_amount_inr, cgst_inr, sgst_inr, igst_inr, total_inr,
                seller_name, seller_gstin, buyer_name, buyer_gstin, billing_address, place_of_supply,
                compliance_hash, status, details_json
            )
            VALUES (?, ?, ?, ?, 'GST', 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?)
            """,
            (
                invoice_number,
                company_id,
                billing_event_id,
                event_type,
                subtotal_inr,
                gst_rate,
                gst_amount,
                cgst_inr,
                sgst_inr,
                igst_inr,
                total_inr,
                seller_name,
                seller_gstin,
                buyer_name,
                buyer_gstin,
                billing_address,
                place_of_supply,
                compliance_hash,
                json.dumps(invoice_details),
            ),
        )
        conn.commit()

        _append_billing_event(
            company_id=company_id,
            actor_email=str(current_user.get("email") or ""),
            event_type="BILLING_TAX_INVOICE_GENERATED",
            status="SUCCESS",
            details_json=json.dumps({"invoice_number": invoice_number, "billing_event_id": billing_event_id}),
        )
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=company_id,
            action="BILLING_INVOICE_GENERATE",
            module="BILLING",
            entity_id=invoice_number,
            details={"billing_event_id": billing_event_id, "total_inr": total_inr},
        )
        return {"status": "success", "invoice_number": invoice_number, "total_inr": total_inr}
    finally:
        conn.close()


@router.get("/billing/invoices")
async def get_billing_invoices(
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_invoices_table(conn)
        rows = conn.execute(
            """
            SELECT id, invoice_number, billing_event_id, event_type, currency, subtotal_inr, gst_rate,
                   gst_amount_inr, cgst_inr, sgst_inr, igst_inr, total_inr, seller_gstin, buyer_gstin,
                   compliance_hash, status, issued_at
            FROM billing_invoices
            WHERE company_id = ?
            ORDER BY issued_at DESC
            LIMIT 100
            """,
            (company_id,),
        ).fetchall()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        conn.close()


@router.get("/billing/invoices/{invoice_number}/download")
async def download_billing_invoice(
    invoice_number: str,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_invoices_table(conn)
        row = conn.execute(
            """
            SELECT invoice_number, company_id, event_type, seller_name, seller_gstin, buyer_name, buyer_gstin,
                   billing_address, place_of_supply, subtotal_inr, gst_rate, cgst_inr, sgst_inr, igst_inr,
                   gst_amount_inr, total_inr, compliance_hash, status, issued_at
            FROM billing_invoices
            WHERE company_id = ? AND invoice_number = ?
            """,
            (company_id, invoice_number),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Billing invoice not found")
        text_payload = _build_billing_invoice_text(dict(row))
        return StreamingResponse(
            iter([text_payload]),
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{invoice_number}.txt"'},
        )
    finally:
        conn.close()


@router.get("/billing/invoices/export.csv")
async def export_billing_invoices_csv(
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_billing_invoices_table(conn)
        rows = conn.execute(
            """
            SELECT invoice_number, billing_event_id, event_type, currency, subtotal_inr, gst_rate, cgst_inr, sgst_inr,
                   igst_inr, gst_amount_inr, total_inr, seller_gstin, buyer_gstin, compliance_hash, status, issued_at
            FROM billing_invoices
            WHERE company_id = ?
            ORDER BY issued_at DESC
            LIMIT 2000
            """,
            (company_id,),
        ).fetchall()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "invoice_number", "billing_event_id", "event_type", "currency", "subtotal_inr", "gst_rate", "cgst_inr",
            "sgst_inr", "igst_inr", "gst_amount_inr", "total_inr", "seller_gstin", "buyer_gstin", "compliance_hash",
            "status", "issued_at",
        ])
        for row in rows:
            writer.writerow([
                row["invoice_number"],
                row["billing_event_id"],
                row["event_type"],
                row["currency"],
                row["subtotal_inr"],
                row["gst_rate"],
                row["cgst_inr"],
                row["sgst_inr"],
                row["igst_inr"],
                row["gst_amount_inr"],
                row["total_inr"],
                row["seller_gstin"],
                row["buyer_gstin"],
                row["compliance_hash"],
                row["status"],
                row["issued_at"],
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="billing_tax_invoices.csv"'},
        )
    finally:
        conn.close()


@router.post("/jobs/analytics")
async def enqueue_analytics_job(
    payload: dict = Body(default={}),
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    job_type = str(payload.get("job_type") or "summary_rollup")
    if job_type not in {"summary_rollup", "monthly_revenue"}:
        raise HTTPException(status_code=400, detail="Unsupported job_type")

    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_analytics_jobs_table(conn)
        cursor = conn.execute(
            """
            INSERT INTO analytics_jobs (company_id, submitted_by, job_type, payload_json, status)
            VALUES (?, ?, ?, ?, 'QUEUED')
            """,
            (
                company_id,
                str(current_user.get("email") or ""),
                job_type,
                json.dumps(payload.get("params") or {}),
            ),
        )
        job_id = int(cursor.lastrowid)
        conn.commit()
    finally:
        conn.close()

    if background_tasks is not None:
        background_tasks.add_task(_run_analytics_job, job_id)

    _append_admin_audit(
        user_id=int(current_user.get("id") or 0),
        company_id=company_id,
        action="ANALYTICS_JOB_ENQUEUED",
        module="OPERATIONS",
        entity_id=str(job_id),
        details={"job_type": job_type},
    )
    return {"status": "success", "job_id": job_id, "job_type": job_type}


@router.get("/jobs/analytics")
async def list_analytics_jobs(
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_analytics_jobs_table(conn)
        rows = conn.execute(
            """
            SELECT id, submitted_by, job_type, status, attempts, error_message, queued_at, started_at, completed_at
            FROM analytics_jobs
            WHERE company_id = ?
            ORDER BY id DESC
            LIMIT 100
            """,
            (company_id,),
        ).fetchall()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        conn.close()


@router.get("/jobs/analytics/{job_id}")
async def get_analytics_job(
    job_id: int,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_analytics_jobs_table(conn)
        row = conn.execute(
            """
            SELECT id, submitted_by, job_type, payload_json, status, attempts, result_json, error_message,
                   queued_at, started_at, completed_at
            FROM analytics_jobs
            WHERE id = ? AND company_id = ?
            """,
            (job_id, company_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        result = dict(row)
        try:
            result["payload"] = json.loads(result.get("payload_json") or "{}")
        except Exception:
            result["payload"] = {}
        try:
            result["result"] = json.loads(result.get("result_json") or "{}")
        except Exception:
            result["result"] = {}
        result.pop("payload_json", None)
        result.pop("result_json", None)
        return result
    finally:
        conn.close()


@router.post("/jobs/analytics/{job_id}/retry")
async def retry_analytics_job(
    job_id: int,
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_analytics_jobs_table(conn)
        row = conn.execute(
            "SELECT id, status FROM analytics_jobs WHERE id = ? AND company_id = ?",
            (job_id, company_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        if str(row[1]).upper() == "RUNNING":
            raise HTTPException(status_code=400, detail="Job already running")
        conn.execute(
            "UPDATE analytics_jobs SET status = 'QUEUED', error_message = NULL, started_at = NULL, completed_at = NULL WHERE id = ?",
            (job_id,),
        )
        conn.commit()
    finally:
        conn.close()

    if background_tasks is not None:
        background_tasks.add_task(_run_analytics_job, job_id)

    _append_admin_audit(
        user_id=int(current_user.get("id") or 0),
        company_id=company_id,
        action="ANALYTICS_JOB_RETRY",
        module="OPERATIONS",
        entity_id=str(job_id),
    )
    return {"status": "success", "job_id": job_id}


@router.get("/organization/seats")
async def get_organization_seat_usage(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_invites_table(conn)
        usage = _get_seat_usage(conn, company_id)
        usage["company_id"] = company_id
        usage["plan"] = _get_plan_for_company(conn, company_id)
        return usage
    finally:
        conn.close()


@router.post("/entitlements/checkout")
async def create_checkout_session(
    payload: dict = Body(...),
    org: Any = Depends(get_current_org),
    current_user: dict = Depends(get_current_user),
):
    """Create a Stripe Checkout session for plan upgrades.

    Accepts body: { "plan": "PRO" | "ENTERPRISE", "success_url": "...", "cancel_url": "..." }
    """
    plan = str(payload.get("plan") or "PRO").upper()
    success_url = payload.get("success_url") or os.getenv("DEFAULT_CHECKOUT_SUCCESS_URL") or ""
    cancel_url = payload.get("cancel_url") or os.getenv("DEFAULT_CHECKOUT_CANCEL_URL") or ""

    try:
        link = BillingService.create_checkout_session(org, plan, success_url or "", cancel_url or "")
        # Razorpay payment_link returns 'short_url' or 'short_url' in the response
        checkout_url = None
        if isinstance(link, dict):
            checkout_url = link.get("short_url") or link.get("short_link") or link.get("shortUrl")
        else:
            checkout_url = getattr(link, "get", lambda k: None)("short_url")

        if not checkout_url:
            raise HTTPException(status_code=500, detail="Failed to create payment link")

        _append_billing_event(
            company_id=str(org.uuid),
            actor_email=str(current_user.get("email") or ""),
            event_type="CHECKOUT_CREATED",
            status="SUCCESS",
            details_json=json.dumps({"plan": plan, "checkout_url": checkout_url}),
        )
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=str(org.uuid),
            action="CREATE_CHECKOUT",
            module="BILLING",
            details={"plan": plan, "status": "SUCCESS"},
        )

        return {"checkout_url": checkout_url}
    except Exception as e:
        _append_billing_event(
            company_id=str(org.uuid),
            actor_email=str(current_user.get("email") or ""),
            event_type="CHECKOUT_CREATED",
            status="FAILED",
            details_json=json.dumps({"plan": plan, "error": str(e)}),
        )
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=str(org.uuid),
            action="CREATE_CHECKOUT",
            module="BILLING",
            details={"plan": plan, "status": "FAILED", "error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/organization/activity")
async def get_organization_activity(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT id, user_id, action, module, entity_id, details, timestamp
            FROM audit_logs
            WHERE company_id = ?
            ORDER BY timestamp DESC
            LIMIT 40
            """,
            (company_id,),
        ).fetchall()
        feed = []
        for row in rows:
            details = {}
            try:
                details = json.loads(row["details"] or "{}")
            except Exception:
                details = {}
            payload = f"{row['id']}|{row['user_id']}|{row['action']}|{row['module']}|{row['entity_id']}|{row['timestamp']}|{json.dumps(details, sort_keys=True)}"
            event_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
            feed.append(
                {
                    "id": row["id"],
                    "user_id": row["user_id"],
                    "action": row["action"],
                    "module": row["module"],
                    "entity_id": row["entity_id"],
                    "details": details,
                    "timestamp": row["timestamp"],
                    "event_hash": event_hash,
                    "severity": str(details.get("severity", "info")).lower(),
                }
            )
        return {"items": feed, "count": len(feed)}
    finally:
        conn.close()


@router.get("/organization/activity/export.csv")
async def export_organization_activity_csv(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT id, user_id, action, module, entity_id, details, timestamp
            FROM audit_logs
            WHERE company_id = ?
            ORDER BY timestamp DESC
            LIMIT 500
            """,
            (company_id,),
        ).fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "user_id", "action", "module", "entity_id", "timestamp", "details_json", "event_hash"])
        for row in rows:
            details = {}
            try:
                details = json.loads(row["details"] or "{}")
            except Exception:
                details = {}
            payload = f"{row['id']}|{row['user_id']}|{row['action']}|{row['module']}|{row['entity_id']}|{row['timestamp']}|{json.dumps(details, sort_keys=True)}"
            event_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
            writer.writerow([
                row["id"],
                row["user_id"],
                row["action"],
                row["module"],
                row["entity_id"],
                row["timestamp"],
                json.dumps(details, sort_keys=True),
                event_hash,
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="organization_activity_export.csv"'},
        )
    finally:
        conn.close()


@router.get("/organization/settings")
async def get_organization_settings(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        profile = conn.execute(
            "SELECT name, industry, hq_location, details_json FROM company_profiles WHERE id = ?",
            (company_id,),
        ).fetchone()
        settings = {}
        if profile and profile["details_json"]:
            try:
                settings = json.loads(profile["details_json"])
            except Exception:
                settings = {}
        plan_row = conn.execute(
            "SELECT subscription_plan FROM organizations WHERE uuid = ?",
            (company_id,),
        ).fetchone()
        plan_code = str((plan_row[0] if plan_row else "FREE") or "FREE").upper()
        seat_limit = _resolve_seat_limit_from_details(settings, plan_code)
        idle_row = conn.execute(
            "SELECT AVG(idle_timeout) FROM users WHERE company_id = ?",
            (company_id,),
        ).fetchone()
        return {
            "company_id": company_id,
            "name": (profile["name"] if profile else None) or "",
            "industry": (profile["industry"] if profile else None) or "",
            "hq_location": (profile["hq_location"] if profile else None) or "",
            "seat_limit": seat_limit,
            "security": {
                "idle_timeout": int((idle_row[0] if idle_row else 3600) or 3600),
                "require_mfa": bool(settings.get("require_mfa", False)),
                "ip_allowlist_enabled": bool(settings.get("ip_allowlist_enabled", False)),
            },
        }
    finally:
        conn.close()


@router.put("/organization/settings")
async def update_organization_settings(
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    security = payload.get("security") or {}
    requested_seat_limit = int(payload.get("seat_limit", 0) or 0)
    idle_timeout = int(security.get("idle_timeout", 3600))
    require_mfa = bool(security.get("require_mfa", False))
    ip_allowlist_enabled = bool(security.get("ip_allowlist_enabled", False))
    idle_timeout = max(300, min(idle_timeout, 86400))

    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT details_json FROM company_profiles WHERE id = ?",
            (company_id,),
        ).fetchone()
        details_json = {}
        if row and row[0]:
            try:
                details_json = json.loads(row[0])
            except Exception:
                details_json = {}

        plan_row = conn.execute(
            "SELECT subscription_plan FROM organizations WHERE uuid = ?",
            (company_id,),
        ).fetchone()
        plan_code = str((plan_row[0] if plan_row else "FREE") or "FREE").upper()
        min_limit = PLAN_SEAT_LIMITS.get(plan_code, PLAN_SEAT_LIMITS["FREE"])
        if requested_seat_limit > 0:
            details_json["seat_limit"] = max(min_limit, requested_seat_limit)
        else:
            details_json["seat_limit"] = _resolve_seat_limit_from_details(details_json, plan_code)

        details_json["require_mfa"] = require_mfa
        details_json["ip_allowlist_enabled"] = ip_allowlist_enabled

        conn.execute(
            """
            UPDATE company_profiles
            SET details_json = ?
            WHERE id = ?
            """,
            (json.dumps(details_json), company_id),
        )
        conn.execute(
            "UPDATE users SET idle_timeout = ? WHERE company_id = ?",
            (idle_timeout, company_id),
        )
        conn.commit()
        _append_admin_audit(
            user_id=int(current_user.get("id") or 0),
            company_id=company_id,
            action="UPDATE_ORG_SETTINGS",
            module="SECURITY",
            details={
                "idle_timeout": idle_timeout,
                "require_mfa": require_mfa,
                "ip_allowlist_enabled": ip_allowlist_enabled,
                "seat_limit": details_json.get("seat_limit"),
            },
        )
        return {"status": "success"}
    finally:
        conn.close()


@router.get("/saas-readiness")
async def get_saas_readiness(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Enterprise SaaS hardening status for operations and platform teams."""
    strict_production = os.getenv("NEURALBI_STRICT_PRODUCTION", "false").lower() == "true"
    simulator_enabled = os.getenv("ENABLE_LIVE_KPI_SIMULATOR", "false").lower() == "true"
    secret_key = os.getenv("SECRET_KEY", "INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION")
    db_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")

    checks = {
        "auth_secret_configured": secret_key != "INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION",
        "strict_production_mode": strict_production,
        "production_like_database": db_url.startswith("postgresql"),
        "synthetic_kpi_simulator_disabled": not simulator_enabled,
        "request_tracing_enabled": bool(request.headers.get("x-request-id") or getattr(request.state, "request_id", None)),
        "tenant_context_present": bool(current_user.get("company_id") and current_user.get("company_id") != "DEFAULT"),
    }

    passed = sum(1 for value in checks.values() if value)
    total = len(checks)
    score = round((passed / total) * 100, 2) if total else 0.0

    return {
        "status": "ready" if score >= 80 else "needs-hardening",
        "score": score,
        "checks": checks,
        "tenant": {
            "company_id": current_user.get("company_id"),
            "role": current_user.get("role"),
        },
    }

@router.get("/health")
async def health_check():
    """Health check endpoint with performance metrics."""
    start_time = time.time()
    memory = psutil.virtual_memory()
    cpu_percent = psutil.cpu_percent(interval=0.1)
    response_time = (time.time() - start_time) * 1000

    return {
        "status": "healthy",
        "timestamp": time.time(),
        "performance": {
            "response_time_ms": round(response_time, 2),
            "memory_percent": memory.percent,
            "cpu_percent": cpu_percent,
        },
        "version": "3.7.0",
    }

@router.get("/cutover-ready")
async def get_cutover_readiness():
    """Live full-cutover readiness status for operations and deployment checks."""
    return run_cutover_checks()

@router.get("/readiness/full")
async def get_full_system_readiness(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Comprehensive readiness status for full business migration on current tenant."""
    # We'll need access to the FastAPI app routes to correctly evaluate readiness
    return evaluate_full_system_readiness(
        company_id=current_user.get("company_id"),
        registered_routes=[getattr(r, "path", "") for r in request.app.routes],
    )

@router.get("/adoption/confidence")
async def get_go_live_confidence(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Go-live confidence scorecard for migration stakeholders."""
    return build_go_live_confidence_report(
        company_id=current_user.get("company_id"),
        registered_routes=[getattr(r, "path", "") for r in request.app.routes],
    )

@router.post("/adoption/parity")
async def get_data_parity(
    payload: dict = Body(...), current_user: dict = Depends(get_current_user)
):
    """Source vs platform record parity by business domain."""
    source_counts = payload.get("source_counts") or payload.get("baseline_counts") or {}
    tolerance = int(payload.get("tolerance", 0))
    return run_data_parity_check(
        company_id=current_user.get("company_id"),
        source_counts=source_counts,
        tolerance=tolerance,
    )

@router.post("/adoption/migration/verify")
async def verify_migration_cutover(
    request: Request,
    payload: dict = Body(default={}),
    current_user: dict = Depends(get_current_user),
    _: Any = Depends(require_org_roles("OWNER", "ADMIN")),
    __: dict = Depends(require_features("migration_verification")),
):
    """End-to-end migration verification summary with explicit GO/NO_GO gate."""
    source_counts = payload.get("source_counts") or payload.get("baseline_counts")
    tolerance = int(payload.get("tolerance", 0))
    return evaluate_migration_verification(
        company_id=current_user.get("company_id"),
        registered_routes=[getattr(r, "path", "") for r in request.app.routes],
        source_counts=source_counts,
        tolerance=tolerance,
    )

@router.post("/adoption/backup-drill")
async def run_adoption_backup_drill(
    current_user: dict = Depends(get_current_user),
    _: Any = Depends(require_org_roles("OWNER", "ADMIN")),
    __: dict = Depends(require_features("backup_restore_drill")),
):
    """Run backup and restore drill to prove recoverability before cutover."""
    return run_backup_restore_drill()

@router.get("/adoption/incident-readiness")
async def get_adoption_incident_readiness(current_user: dict = Depends(get_current_user)):
    """Operational incident readiness status for post-go-live continuity."""
    return get_incident_readiness()


@router.get("/operations/overview")
async def get_operations_overview(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR", "FINANCE", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_analytics_jobs_table(conn)
        _ensure_billing_events_table(conn)

        queue_counts_rows = conn.execute(
            """
            SELECT status, COUNT(*) AS c
            FROM analytics_jobs
            WHERE company_id = ?
            GROUP BY status
            """,
            (company_id,),
        ).fetchall()
        queue_counts = {str(r["status"]): int(r["c"] or 0) for r in queue_counts_rows}

        billing_failures_row = conn.execute(
            """
            SELECT COUNT(*) FROM billing_events
            WHERE company_id = ? AND status = 'FAILED'
            """,
            (company_id,),
        ).fetchone()
        billing_failures = int((billing_failures_row[0] if billing_failures_row else 0) or 0)

        recent_security_rows = conn.execute(
            """
            SELECT details
            FROM audit_logs
            WHERE company_id = ? AND module = 'SECURITY'
            ORDER BY timestamp DESC
            LIMIT 100
            """,
            (company_id,),
        ).fetchall()
        security_incidents = 0
        high_severity = 0
        for row in recent_security_rows:
            details = {}
            try:
                details = json.loads(row["details"] or "{}")
            except Exception:
                details = {}
            severity = str(details.get("severity", "info")).lower()
            if severity in {"medium", "high", "critical"}:
                security_incidents += 1
            if severity in {"high", "critical"}:
                high_severity += 1
    finally:
        conn.close()

    health = await health_monitor.full_health_check()
    overall = str(health.get("overall_status", "unknown"))
    return {
        "company_id": company_id,
        "timestamp": datetime.utcnow().isoformat(),
        "overall_status": overall,
        "systems": health.get("systems", {}),
        "signals": {
            "analytics_queue": {
                "queued": int(queue_counts.get("QUEUED", 0)),
                "running": int(queue_counts.get("RUNNING", 0)),
                "failed": int(queue_counts.get("FAILED", 0)),
                "completed": int(queue_counts.get("COMPLETED", 0)),
            },
            "billing_failures": billing_failures,
            "security_incidents_recent": security_incidents,
            "high_severity_incidents_recent": high_severity,
        },
    }


@router.get("/operations/runbooks")
async def get_operations_runbooks(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR", "FINANCE", "ANALYST")),
):
    return {
        "items": [
            {
                "id": "runbook_auth_lockout",
                "title": "Auth Lockout / MFA Block",
                "severity": "high",
                "steps": [
                    "Check Admin Activity Feed for SECURITY_MFA_BLOCK or SECURITY_IP_BLOCK.",
                    "Validate organization security settings (require_mfa, ip_allowlist_enabled).",
                    "Temporarily relax policy for affected user, then re-apply with verified IP/MFA.",
                ],
                "owner": "Security Admin",
            },
            {
                "id": "runbook_billing_failure",
                "title": "Billing Payment Failure / Grace State",
                "severity": "high",
                "steps": [
                    "Inspect Billing Audit and Subscription Lifecycle panel.",
                    "Confirm payment method and regenerate checkout if needed.",
                    "Track grace window and escalate before grace end.",
                ],
                "owner": "Finance Ops",
            },
            {
                "id": "runbook_queue_backlog",
                "title": "Analytics Queue Backlog",
                "severity": "medium",
                "steps": [
                    "Open Analytics Job Queue and inspect QUEUED/RUNNING/FAILED counts.",
                    "Retry failed jobs and verify payload integrity.",
                    "Scale background workers or reduce job batch size if backlog persists.",
                ],
                "owner": "Platform Ops",
            },
            {
                "id": "runbook_data_recovery",
                "title": "Data Recovery / Backup Drill",
                "severity": "critical",
                "steps": [
                    "Run backup drill endpoint to verify current recoverability state.",
                    "Confirm last successful backup artifact and restoration evidence.",
                    "Execute restore process in isolated environment before production restore.",
                ],
                "owner": "DBA / Platform Lead",
            },
        ],
        "count": 4,
    }


@router.post("/operations/backup-drill/run")
async def run_operations_backup_drill(
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    actor_email = str(current_user.get("email") or "")
    result = run_backup_restore_drill()
    serialized = json.dumps(result, sort_keys=True)
    evidence_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_backup_drills_table(conn)
        conn.execute(
            """
            INSERT INTO backup_drills (company_id, initiated_by, status, summary_json, evidence_hash)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                company_id,
                actor_email,
                str(result.get("status") or "UNKNOWN").upper(),
                serialized,
                evidence_hash,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    _append_admin_audit(
        user_id=int(current_user.get("id") or 0),
        company_id=company_id,
        action="BACKUP_DRILL_RUN",
        module="OPERATIONS",
        details={"status": result.get("status"), "evidence_hash": evidence_hash},
    )
    return {"status": "success", "result": result, "evidence_hash": evidence_hash}


@router.get("/operations/backup-drill/history")
async def get_operations_backup_drill_history(
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_backup_drills_table(conn)
        rows = conn.execute(
            """
            SELECT id, initiated_by, status, summary_json, evidence_hash, executed_at
            FROM backup_drills
            WHERE company_id = ?
            ORDER BY executed_at DESC
            LIMIT 50
            """,
            (company_id,),
        ).fetchall()
        items = []
        for row in rows:
            summary = {}
            try:
                summary = json.loads(row["summary_json"] or "{}")
            except Exception:
                summary = {}
            items.append(
                {
                    "id": row["id"],
                    "initiated_by": row["initiated_by"],
                    "status": row["status"],
                    "summary": summary,
                    "evidence_hash": row["evidence_hash"],
                    "executed_at": row["executed_at"],
                }
            )
        return {"items": items, "count": len(items)}
    finally:
        conn.close()


@router.get("/operations/data-lineage")
async def get_data_lineage(
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_data_lineage_table(conn)
        rows = conn.execute(
            """
            SELECT id, source_type, source_ref, transform_stage, output_ref, metadata_json, created_by, created_at
            FROM data_lineage
            WHERE company_id = ?
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (company_id,),
        ).fetchall()
        items = []
        for row in rows:
            meta = {}
            try:
                meta = json.loads(row["metadata_json"] or "{}")
            except Exception:
                meta = {}
            items.append(
                {
                    "id": row["id"],
                    "source_type": row["source_type"],
                    "source_ref": row["source_ref"],
                    "transform_stage": row["transform_stage"],
                    "output_ref": row["output_ref"],
                    "metadata": meta,
                    "created_by": row["created_by"],
                    "created_at": row["created_at"],
                }
            )
        return {"items": items, "count": len(items)}
    finally:
        conn.close()


@router.get("/operations/model-versions")
async def get_model_versions(
    current_user: dict = Depends(require_user_roles("ADMIN", "FINANCE", "HR", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        _ensure_model_versions_table(conn)
        rows = conn.execute(
            """
            SELECT id, model_name, version_tag, status, notes, metadata_json, created_by, created_at
            FROM model_versions
            WHERE company_id = ?
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (company_id,),
        ).fetchall()
        items = []
        for row in rows:
            meta = {}
            try:
                meta = json.loads(row["metadata_json"] or "{}")
            except Exception:
                meta = {}
            items.append(
                {
                    "id": row["id"],
                    "model_name": row["model_name"],
                    "version_tag": row["version_tag"],
                    "status": row["status"],
                    "notes": row["notes"],
                    "metadata": meta,
                    "created_by": row["created_by"],
                    "created_at": row["created_at"],
                }
            )
        return {"items": items, "count": len(items)}
    finally:
        conn.close()


@router.post("/operations/model-versions")
async def create_model_version(
    payload: dict = Body(...),
    current_user: dict = Depends(require_user_roles("ADMIN", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    model_name = str(payload.get("model_name") or "").strip()
    version_tag = str(payload.get("version_tag") or "").strip()
    status = str(payload.get("status") or "ACTIVE").upper()
    notes = str(payload.get("notes") or "").strip()
    metadata = payload.get("metadata") or {}

    if not model_name:
        raise HTTPException(status_code=400, detail="model_name is required")
    if not version_tag:
        raise HTTPException(status_code=400, detail="version_tag is required")
    if status not in {"ACTIVE", "SHADOW", "DEPRECATED", "ROLLED_BACK"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_model_versions_table(conn)
        conn.execute(
            """
            INSERT INTO model_versions (company_id, model_name, version_tag, status, notes, metadata_json, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                company_id,
                model_name,
                version_tag,
                status,
                notes,
                json.dumps(metadata),
                str(current_user.get("email") or ""),
            ),
        )
        conn.commit()
    finally:
        conn.close()

    _append_admin_audit(
        user_id=int(current_user.get("id") or 0),
        company_id=company_id,
        action="MODEL_VERSION_CREATE",
        module="OPERATIONS",
        details={"model_name": model_name, "version_tag": version_tag, "status": status},
    )
    return {"status": "success", "model_name": model_name, "version_tag": version_tag}


@router.get("/operations/rbac/coverage")
async def get_rbac_coverage(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR", "ANALYST")),
):
    """Static audit matrix for launch-critical module/action role coverage."""
    matrix = [
        {"module": "enterprise_control", "action": "manage_team", "required_roles": ["ADMIN", "HR"], "ui_guarded": True},
        {"module": "enterprise_control", "action": "upgrade_plan", "required_roles": ["ADMIN"], "ui_guarded": True},
        {"module": "enterprise_control", "action": "security_policy_update", "required_roles": ["ADMIN"], "ui_guarded": True},
        {"module": "billing", "action": "request_refund", "required_roles": ["ADMIN", "FINANCE"], "ui_guarded": True},
        {"module": "billing", "action": "generate_tax_invoice", "required_roles": ["ADMIN", "FINANCE", "HR"], "ui_guarded": True},
        {"module": "workspace_finance", "action": "create_invoice", "required_roles": ["ADMIN", "FINANCE", "SALES"], "ui_guarded": True},
        {"module": "workspace_inventory", "action": "manage_inventory", "required_roles": ["ADMIN", "WAREHOUSE"], "ui_guarded": True},
        {"module": "operations", "action": "enqueue_analytics_job", "required_roles": ["ADMIN", "FINANCE", "ANALYST"], "ui_guarded": True},
        {"module": "operations", "action": "backup_drill_run", "required_roles": ["ADMIN", "FINANCE", "HR"], "ui_guarded": True},
        {"module": "operations", "action": "model_version_register", "required_roles": ["ADMIN", "ANALYST"], "ui_guarded": True},
    ]
    total = len(matrix)
    covered = sum(1 for row in matrix if row.get("ui_guarded"))
    score = int(round((covered / total) * 100)) if total else 0
    return {
        "summary": {
            "total_actions": total,
            "covered_actions": covered,
            "coverage_score": score,
            "status": "READY" if score >= 95 else "NEEDS_REVIEW",
        },
        "items": matrix,
    }


@router.get("/api/versioning-policy")
async def get_api_versioning_policy(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR", "ANALYST")),
):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return {
        "effective_date": today,
        "current_version": "v1",
        "supported_versions": [
            {"version": "v1", "status": "ACTIVE", "sunset_date": None},
        ],
        "deprecation_policy": {
            "notice_period_days": 90,
            "communication_channels": ["in_app_banner", "release_notes", "admin_activity_feed"],
            "breaking_change_window": "quarterly",
        },
        "endpoint_prefix_rules": {
            "versioned_prefix_required": True,
            "allowed_prefixes": ["/api/v1"],
            "legacy_prefixes": ["/api/backend"],
        },
    }


@router.get("/operations/quality-gates")
async def get_quality_gates(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR", "ANALYST")),
):
    gates = [
        {"name": "backend_integration_tests", "status": "CONFIGURED", "required": True},
        {"name": "frontend_e2e_tests", "status": "CONFIGURED", "required": True},
        {"name": "load_smoke_tests", "status": "CONFIGURED", "required": True},
        {"name": "security_scan", "status": "CONFIGURED", "required": True},
    ]
    score = int(round((sum(1 for g in gates if g["status"] == "CONFIGURED") / len(gates)) * 100))
    return {
        "summary": {
            "score": score,
            "status": "READY" if score == 100 else "INCOMPLETE",
        },
        "gates": gates,
    }


@router.get("/operations/deployment-workflow")
async def get_deployment_workflow(
    current_user: dict = Depends(require_user_roles("ADMIN", "HR", "ANALYST")),
):
    return {
        "workflow": "CANARY_WITH_ROLLBACK",
        "stages": [
            {"stage": "preflight", "description": "Run readiness + quality gates", "required": True},
            {"stage": "canary_10_percent", "description": "Route 10% traffic to new release", "required": True},
            {"stage": "observe_15_minutes", "description": "Track error rate, latency, auth failures", "required": True},
            {"stage": "scale_50_percent", "description": "Increase traffic after stable canary", "required": True},
            {"stage": "full_rollout", "description": "Promote release to 100%", "required": True},
        ],
        "rollback_policy": {
            "auto_rollback_conditions": [
                "error_rate_increase_gt_2_percent",
                "p95_latency_increase_gt_30_percent",
                "auth_failure_spike",
            ],
            "rollback_target": "previous_stable_release",
            "max_rollback_time_minutes": 10,
        },
    }


@router.get("/operations/launch-final-review")
async def get_launch_final_review(
    request: Request,
    current_user: dict = Depends(require_user_roles("ADMIN", "HR", "ANALYST")),
):
    company_id = current_user.get("company_id") or "DEFAULT"
    readiness = evaluate_full_system_readiness(
        company_id=company_id,
        registered_routes=[getattr(r, "path", "") for r in request.app.routes],
    )
    cutover = run_cutover_checks()
    ops = await get_operations_overview(current_user=current_user)
    rbac = await get_rbac_coverage(current_user=current_user)
    quality = await get_quality_gates(current_user=current_user)

    checks = {
        "system_readiness": str(readiness.get("overall", "")).upper() == "READY",
        "cutover_ready": str(cutover.get("status", "")).lower() in {"ready", "healthy", "pass", "passed"},
        "operations_overview_healthy": str(ops.get("overall_status", "")).lower() in {"healthy", "degraded"},
        "rbac_coverage_ready": str(rbac.get("summary", {}).get("status", "")).upper() == "READY",
        "quality_gates_ready": str(quality.get("summary", {}).get("status", "")).upper() == "READY",
    }
    score = int(round((sum(1 for v in checks.values() if v) / len(checks)) * 100))
    blockers = [k for k, ok in checks.items() if not ok]
    return {
        "company_id": company_id,
        "timestamp": datetime.utcnow().isoformat(),
        "score": score,
        "status": "GO" if score >= 80 else "HOLD",
        "checks": checks,
        "blockers": blockers,
        "references": {
            "system_readiness": readiness,
            "cutover": cutover,
            "operations": ops,
            "rbac": rbac.get("summary"),
            "quality": quality.get("summary"),
        },
    }
