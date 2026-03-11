import os
from datetime import datetime
import time
import math
import uuid
import traceback
import pandas as pd
import numpy as np
import sqlite3
import bcrypt
import jwt
import io

from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
from collections import defaultdict

from app.services.pipeline_controller import run_pipeline
from app.engines.nlbi_engine import generate_chart_from_question, run_nl_query as run_nlbi_pipeline
from app.utils.dataset_intelligence import get_dataset_summary
from app.engines.copilot_engine import handle_question
from app.engines.deep_rl_engine import train_dqn
from app.engines.dashboard_generator import generate_ai_dashboard
from app.core.database_manager import store_data, create_user_record, get_user_record, init_auth_db, DB_PATH
from app.utils.data_loader import load_data_robustly, get_excel_sheets
from app.utils.pdf_generator import create_pdf_from_text
from app.engines.workspace_engine import WorkspaceEngine
from app.engines.derivatives_engine import DerivativesEngine
from app.engines.rag_engine import build_dataset_index, search_dataset


try:
    import sentry_sdk
    # Enterprise Sentry Trace Tracking (Mock DSN for local)
    sentry_sdk.init(
        dsn="https://mock_public_key@mock_sentry.io/12345", 
        traces_sample_rate=1.0,
        environment="production"
    )
except ImportError:
    print("Sentry SDK not found. Skipping initialization.")
    sentry_sdk = None

try:
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:
    Instrumentator = None

app = FastAPI(title="NeuralBI Enterprise API", version="2.5.0")

# Enterprise Prometheus Telemetry
if Instrumentator:
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# Init User DB on startup
init_auth_db()

SECRET_KEY = "neural_bi_enterprise_secret_2026"
ALGORITHM = "HS256"
@app.get("/health")
async def health_check():
    from app.utils.torch_runtime import load_torch
    has_torch, _, _, _, torch_err = load_torch("HealthCheck")
    from app.engines.rag_engine import HAS_RAG_DEPS
    
    return {
        "status": "online",
        "engines": {
            "torch": "available" if has_torch else "fallback_mode_active",
            "rag": "neural" if HAS_RAG_DEPS else "text_matching_active",
            "workspace": "active",
            "financial": "active"
        },
        "neural_error": torch_err
    }

# Corporate Data Session Caching
_sessions = {}

def _make_serializable(obj):
    if isinstance(obj, dict):
        return {k: _make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_make_serializable(v) for v in obj]
    if isinstance(obj, (float, int)) and not math.isfinite(obj):
        return None
    if isinstance(obj, (datetime, np.datetime64)):
        return str(obj)
    return obj

# --- AUTH ENDPOINTS ---
@app.post("/register")
async def register(email: str = Body(...), password: str = Body(...)):
    salt = bcrypt.gensalt()
    pwd_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    success = create_user_record(email, pwd_hash)
    if success:
        token = jwt.encode({"email": email, "exp": time.time() + 86400}, SECRET_KEY, algorithm=ALGORITHM)
        return {"message": "User created", "token": token}
    return JSONResponse(status_code=400, content={"error": "Email already registered"})

@app.post("/login")
async def login(email: str = Body(...), password: str = Body(...)):
    user = get_user_record(email)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Invalid email or password"})
    
    stored_hash = user[1]
    if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
        token = jwt.encode({"email": email, "exp": time.time() + 86400}, SECRET_KEY, algorithm=ALGORITHM)
        return {"token": token}
    
    return JSONResponse(status_code=401, content={"error": "Invalid email or password"})

# Security: Configurable CORS rather than raw wildcard
def _collect_allowed_origins():
    raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    for env_key in ("FRONTEND_URL", "NEXT_PUBLIC_SITE_URL", "APP_URL"):
        value = os.getenv(env_key, "").strip()
        if value and value not in origins:
            origins.append(value)

    return origins


ALLOWED_ORIGINS = _collect_allowed_origins()
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX", r"https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.onrender\.com)(:\d+)?")
DEBUG_MODE = os.getenv("DEBUG", "False").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security: Basic In-Memory IP Rate Limiter for DDoS protection
# In production, swap this with Redis Token Bucket
_rate_limits = defaultdict(list)
RATE_LIMIT_MAX_REQUESTS = 50
RATE_LIMIT_WINDOW_SEC = 60

@app.middleware("http")
async def rate_limiter_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()

    # Do not rate-limit local development traffic proxied through Next.js.
    if client_ip in {"127.0.0.1", "::1", "localhost"}:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response
    
    # Filter expired requests
    _rate_limits[client_ip] = [t for t in _rate_limits[client_ip] if now - t < RATE_LIMIT_WINDOW_SEC]
    
    if len(_rate_limits[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(status_code=429, content={"error": "Too many requests. Please slow down."})
    
    _rate_limits[client_ip].append(now)
    response = await call_next(request)
    return response

# --- WORKSPACE & DATA ENDPOINTS ---

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Accepts CSV/Excel and pumps it into the Workspace Core Engine."""
    try:
        content = await file.read()
        file_io = io.BytesIO(content)
        df = load_data_robustly(file_io, file.filename)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="The file is empty or corrupted.")
            
        res = WorkspaceEngine.sync_dataset_to_workspace(df)
        if res.get("status") == "error":
            raise HTTPException(status_code=500, detail=res.get("message"))
        
        # New Session ID for this Sync
        dataset_id = f"UPLOAD-{uuid.uuid4().hex[:6].upper()}"
        _sessions[dataset_id] = {
            "df": df,
            "filename": file.filename,
            "timestamp": time.time(),
            "pipeline": run_pipeline(df)
        }

        # Index for RAG and persistent store
        build_dataset_index(df)
        store_data(dataset_id, df)
        
        return {**res, "dataset_id": dataset_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workspace/invoices")
async def get_invoices():
    return WorkspaceEngine.get_invoices()

@app.post("/workspace/invoices")
async def create_invoice(data: dict = Body(...)):
    return WorkspaceEngine.create_invoice(data)

@app.put("/workspace/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: dict = Body(...)):
    return WorkspaceEngine.update_invoice(invoice_id, data)

@app.delete("/workspace/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    return WorkspaceEngine.delete_invoice(invoice_id)

@app.get("/workspace/customers")
async def get_customers():
    return WorkspaceEngine.get_customers()

@app.post("/workspace/customers")
async def add_customer(data: dict = Body(...)):
    return WorkspaceEngine.add_customer(data)

@app.put("/workspace/customers/{customer_id}")
async def update_customer(customer_id: int, data: dict = Body(...)):
    return WorkspaceEngine.update_customer(customer_id, data)

@app.delete("/workspace/customers/{customer_id}")
async def delete_customer(customer_id: int):
    return WorkspaceEngine.delete_customer(customer_id)

@app.get("/workspace/inventory")
async def get_inventory():
    return WorkspaceEngine.get_inventory()

@app.get("/workspace/inventory/health")
async def get_inventory_health():
    return WorkspaceEngine.get_inventory_health()

@app.post("/workspace/inventory")
async def add_inventory_item(data: dict = Body(...)):
    return WorkspaceEngine.add_inventory_item(data)

@app.put("/workspace/inventory/{item_id}")
async def update_inventory_item(item_id: int, data: dict = Body(...)):
    return WorkspaceEngine.update_inventory_item(item_id, data)

@app.delete("/workspace/inventory/{item_id}")
async def delete_inventory_item(item_id: int):
    return WorkspaceEngine.delete_inventory_item(item_id)

@app.get("/workspace/expenses")
async def get_expenses():
    return WorkspaceEngine.get_expenses()

@app.post("/workspace/expenses")
async def add_expense_post(data: dict = Body(...)):
    return WorkspaceEngine.add_expense(data)

@app.put("/workspace/expenses/{expense_id}")
async def update_expense(expense_id: int, data: dict = Body(...)):
    return WorkspaceEngine.update_expense(expense_id, data)

@app.delete("/workspace/expenses/{expense_id}")
async def delete_expense(expense_id: int):
    return WorkspaceEngine.delete_expense(expense_id)

@app.get("/workspace/ledger")
async def get_ledger():
    return WorkspaceEngine.get_ledger()

@app.post("/workspace/ledger")
async def add_ledger_entry(data: dict = Body(...)):
    return WorkspaceEngine.add_ledger_entry(data)

@app.put("/workspace/ledger/{entry_id}")
async def update_ledger_entry(entry_id: int, data: dict = Body(...)):
    return WorkspaceEngine.update_ledger_entry(entry_id, data)

@app.delete("/workspace/ledger/{entry_id}")
async def delete_ledger_entry(entry_id: int):
    return WorkspaceEngine.delete_ledger_entry(entry_id)

@app.get("/workspace/accounting/notes")
async def get_accounting_notes():
    return WorkspaceEngine.get_accounting_notes()

@app.post("/workspace/accounting/notes")
async def add_accounting_note(data: dict = Body(...)):
    """Records a new Debit or Credit correction note."""
    res = WorkspaceEngine.add_accounting_note(data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.put("/workspace/accounting/notes/{note_id}")
async def update_accounting_note(note_id: int, data: dict = Body(...)):
    """Updates an existing accounting note."""
    res = WorkspaceEngine.update_accounting_note(note_id, data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.delete("/workspace/accounting/notes/{note_id}")
async def delete_accounting_note(note_id: int):
    """Deletes an accounting note."""
    res = WorkspaceEngine.delete_accounting_note(note_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.get("/workspace/accounting/statements")
async def get_financial_statements():
    """Generates real-time Balance Sheet and P&L statements."""
    return WorkspaceEngine.get_financial_statements()

@app.get("/workspace/marketing/campaigns")
async def get_marketing_campaigns():
    """Retrieves all marketing campaign ROI data."""
    return WorkspaceEngine.get_marketing_campaigns()

@app.post("/workspace/marketing/campaigns")
async def create_marketing_campaign(data: dict = Body(...)):
    return WorkspaceEngine.create_marketing_campaign(data)

@app.put("/workspace/marketing/campaigns/{campaign_id}")
async def update_marketing_campaign(campaign_id: int, data: dict = Body(...)):
    return WorkspaceEngine.update_marketing_campaign(campaign_id, data)

@app.delete("/workspace/marketing/campaigns/{campaign_id}")
async def delete_marketing_campaign(campaign_id: int):
    return WorkspaceEngine.delete_marketing_campaign(campaign_id)

@app.get("/workspace/accounting/daybook")
async def get_daybook():
    """Retrieves a chronological audit trail of all business vouchers."""
    return WorkspaceEngine.get_daybook()

@app.get("/workspace/accounting/trial-balance")
async def get_trial_balance():
    """Generates a real-time Trial Balance of all active ledgers."""
    return WorkspaceEngine.get_trial_balance()

@app.get("/workspace/accounting/pl")
async def get_pl_statement():
    """Generates a structured Profit & Loss statement."""
    return WorkspaceEngine.get_pl_statement()

@app.get("/workspace/accounting/balance-sheet")
async def get_balance_sheet():
    """Generates a structured Balance Sheet (Assets vs Liabilities)."""
    return WorkspaceEngine.get_balance_sheet()

@app.get("/workspace/accounting/customer-ledger/{customer_id}")
async def get_customer_ledger(customer_id: str):
    """Retrieves a granular audit trail for a specific customer."""
    return WorkspaceEngine.get_customer_ledger(customer_id)

@app.post("/workspace/accounting/payments")
async def record_payment(data: dict = Body(...)):
    """Records a professional receipt voucher (Customer Payment)."""
    return WorkspaceEngine.record_payment(data)

@app.post("/workspace/accounting/reconcile")
async def reconcile_bank_statement(data: dict = Body(...)):
    """AI BRS: Matches bank transactions with ledger events."""
    entries = data.get("entries", [])
    return WorkspaceEngine.reconcile_bank_statement(entries)

@app.get("/workspace/accounting/gst")
async def get_gst_reports():
    """Generates statutory GSTR-1 and GSTR-3B summaries."""
    return WorkspaceEngine.get_gst_reports()

@app.post("/workspace/accounting/derivatives")
async def get_derivatives_snapshot(data: dict = Body(default={})):
    """Returns option chain, technical indicators, Greeks, and hedge optimizer analytics."""
    try:
        return DerivativesEngine.get_derivatives_snapshot(
            underlying=data.get("underlying", "NIFTY"),
            expiry=data.get("expiry"),
            portfolio_value=float(data.get("portfolio_value", 10_000_000)),
            portfolio_beta=float(data.get("portfolio_beta", 0.95)),
            hedge_ratio_target=float(data.get("hedge_ratio_target", 1.0)),
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Derivatives analytics failed: {str(e)}")

@app.get("/dashboard/sync-workspace")
async def sync_workspace_to_dashboard():
    """
    Cognitive Sync: Pulls Live Workspace Data, runs full AI Pipeline, 
    and returns Dashboard-ready state.
    """
    try:
        df = WorkspaceEngine.get_enterprise_analytics_df()
        
        if df.empty:
            return JSONResponse(status_code=400, content={"error": "No business ledger data found. Add invoices or expenses first."})

        # Run full NeuralBI Pipeline on Workspace Ledger
        pipeline = run_pipeline(df)
        processed_df = pipeline.get("_df", df)
        
        # New Session ID for this Sync
        dataset_id = f"LIVE-SYNC-{uuid.uuid4().hex[:6].upper()}"

        # Index for RAG and persistent store
        build_dataset_index(processed_df)
        store_data(dataset_id, processed_df)
        
        # Cache for Copilot/NLBI
        _sessions[dataset_id] = {
            "df": processed_df,
            "filename": "Live ERP Stream",
            "timestamp": time.time(),
            "pipeline": pipeline
        }

        summary = get_dataset_summary(processed_df)
        sample_df = processed_df.head(1000).copy()
        for col in sample_df.columns:
            if pd.api.types.is_datetime64_any_dtype(sample_df[col]):
                sample_df[col] = sample_df[col].astype(str)
        raw_data = sample_df.where(sample_df.notna(), None).to_dict(orient="records")

        response = {
            "dataset_id": dataset_id,
            "is_live": True,
            "rows": len(df),
            "analytics": pipeline.get("analytics", {}),
            "ml_predictions": pipeline.get("ml_predictions", {}),
            "insights": pipeline.get("insights", []),
            "strategy": pipeline.get("strategy", []),
            "analyst_report": pipeline.get("analyst_report", {}),
            "strategic_plan": pipeline.get("strategic_plan", ""),
            "recommendations": pipeline.get("recommendations", []),
            "explanations": pipeline.get("explanations", []),
            "simulation_results": pipeline.get("simulation_results", []),
            "anomalies": pipeline.get("anomalies", []),
            "clustering": pipeline.get("clustering", {}),
            "data_quality": pipeline.get("data_quality", 1.0),
            "confidence_score": pipeline.get("confidence_score", 0.7),
            "summary": summary,
            "dataset_summary": summary,
            "raw_data": raw_data,
            "columns": list(processed_df.columns),
            "numeric_columns": processed_df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": processed_df.select_dtypes(include=["object"]).columns.tolist(),
        }
        return _make_serializable(response)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Live Sync Failed: {str(e)}"})

@app.post("/workspace/accounting/reminders/{invoice_id}")
async def send_invoice_reminder(invoice_id: str):
    """Triggers an autonomous payment reminder for a specific invoice."""
    return WorkspaceEngine.send_payment_reminder(invoice_id)

@app.get("/workspace/export/{table_name}")
async def export_workspace_data(table_name: str):
    """Generates and streams a CSV version of the requested business table."""
    valid_tables = ["invoices", "customers", "inventory", "expenses", "ledger", "marketing_campaigns", "notes"]
    
    # Map 'marketing' alias to 'marketing_campaigns' table
    if table_name == "marketing":
        table_name = "marketing_campaigns"

    if table_name not in valid_tables:
        # Check if it's a report instead of a raw table
        if table_name == "trial_balance":
            csv_data = WorkspaceEngine.export_trial_balance()
        elif table_name == "daybook":
            csv_data = WorkspaceEngine.export_daybook()
        elif table_name == "p_and_l":
            csv_data = WorkspaceEngine.export_p_and_l()
        elif table_name == "balance_sheet":
            csv_data = WorkspaceEngine.export_balance_sheet()
        else:
            raise HTTPException(status_code=400, detail="Invalid table name or report for export.")
    else:
        csv_data = WorkspaceEngine.export_to_csv(table_name)

    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table_name}_export_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@app.get("/workspace/export/customer-ledger/{customer_id}")
async def export_customer_ledger(customer_id: str):
    """Generates and streams a CSV version of a specific customer's ledger."""
    csv_data = WorkspaceEngine.export_customer_ledger(customer_id)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ledger_{customer_id}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@app.get("/workspace/business-report/download")
async def download_consolidated_report():
    """Generates and streams a unified business performance report."""
    report_text = WorkspaceEngine.generate_consolidated_business_report()
    return PlainTextResponse(
        report_text,
        headers={"Content-Disposition": "attachment; filename=NeuralBI_Consolidated_Report.txt"}
    )

@app.post("/copilot-chat")
async def copilot_chat(request: Request):
    """
    Live AI Command Center (Copilot v2):
    Answers business questions by querying live SQL or the latest AI context.
    """
    body = await request.json()
    query = body.get("query", "")
    dataset_id = body.get("dataset_id") # Optional: specific context
    
    if not query:
        return {
            "response": "I'm listening. Ask about totals, trends, top performers, risks, margins, or customer and inventory patterns.",
            "answer": "I'm listening. Ask about totals, trends, top performers, risks, margins, or customer and inventory patterns.",
            "suggested_questions": [
                "Summarize the current data",
                "What are the top contributors?",
                "Show the main risks in the data",
            ],
        }
    
    # 1. Get Context
    context_df = None
    analytics = {}
    pipeline = None
    if dataset_id and dataset_id in _sessions:
        session = _sessions[dataset_id]
        context_df = session.get("df")
        analytics = session.get("analytics", {})
        pipeline = session.get("pipeline")
    else:
        # Fallback: Live Workspace Data
        context_df = WorkspaceEngine.get_enterprise_analytics_df()
        if context_df is not None and not context_df.empty:
            numeric_cols = context_df.select_dtypes(include=[np.number]).columns.tolist()
            if numeric_cols:
                primary_metric = "revenue" if "revenue" in numeric_cols else numeric_cols[0]
                analytics["total_revenue"] = float(context_df[primary_metric].sum())
                analytics["average_revenue"] = float(context_df[primary_metric].mean())
            if "product" in context_df.columns and numeric_cols:
                metric = "revenue" if "revenue" in context_df.columns else numeric_cols[0]
                analytics["top_products"] = (
                    context_df.groupby("product")[metric].sum().sort_values(ascending=False).head(5).to_dict()
                )
            if "region" in context_df.columns and numeric_cols:
                metric = "revenue" if "revenue" in context_df.columns else numeric_cols[0]
                analytics["region_sales"] = context_df.groupby("region")[metric].sum().to_dict()
        
    # 2. Query Logic (Heuristic for now, can be LLM-powered)
    try:
        # Log the usage
        WorkspaceEngine.log_usage("Copilot", f"Query: {query[:50]}...")
        if context_df is None or context_df.empty:
            msg = "No active dataset or synced workspace context is available. Upload a dataset or sync workspace data first."
            return {
                "response": msg,
                "answer": msg,
                "suggested_questions": [
                    "Summarize the current data",
                    "What are the top products?",
                    "Show revenue trends",
                ],
            }

        ml_results = pipeline.get("ml_predictions", {}) if pipeline else {}
        result = handle_question(query, context_df, analytics, ml_results, pipeline)
        if not result:
            result = run_nlbi_pipeline(query, context_df)

        suggestions = [
            "Summarize the current data",
            "What are the top 5 contributors?",
            "Show trend over time",
        ]
        if "product" in context_df.columns:
            suggestions[1] = "What are the top 5 products?"
        elif "customer" in " ".join(map(str.lower, context_df.columns)):
            suggestions[1] = "Which customers contribute the most?"

        return {
            "response": result,
            "answer": result,
            "context_rows": int(len(context_df)),
            "suggested_questions": suggestions,
        }
    except Exception as e:
        msg = f"Neural Link Error: {str(e)}"
        return {"response": msg, "answer": msg, "suggested_questions": []}

@app.get("/workspace/accounting/cfo-report")
async def get_cfo_report():
    """Generates a high-level CFO health report."""
    return WorkspaceEngine.get_cfo_health_report()

@app.get("/workspace/usage-stats")
async def get_usage_stats():
    """Returns platform engagement analytics."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        logs = conn.execute("SELECT module, COUNT(*) as count FROM usage_logs GROUP BY module ORDER BY count DESC").fetchall()
        return [dict(log) for log in logs]
    finally:
        conn.close()

@app.post("/copilot/{dataset_id}")
async def ask_copilot(dataset_id: str, question: str = Body(...)):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = _sessions[dataset_id]
    df = session["df"]
    # Quick analytics for context
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    analytics = {"total_rows": len(df)}
    if numeric_cols:
        analytics["total_revenue"] = float(df[numeric_cols[0]].sum())
    
    res = handle_question(question, df, analytics, session.get("pipeline", {}).get("ml_predictions", {}), session.get("pipeline"))
    return {"answer": res}

@app.post("/nlbi/{dataset_id}")
async def ask_nlbi(dataset_id: str, question: str = Body(...)):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    res = run_nlbi_pipeline(question, _sessions[dataset_id]["df"])
    return {"answer": res}

@app.post("/pricing-optimization/{dataset_id}")
async def get_pricing_opt(dataset_id: str):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    pipeline = _sessions[dataset_id].get("pipeline", {})
    return pipeline.get("ml_predictions", {}).get("pricing_optimization", {})

@app.post("/dashboard-config/{dataset_id}")
async def get_dashboard_config(dataset_id: str):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return generate_ai_dashboard(_sessions[dataset_id]["df"])

@app.get("/download-report/{dataset_id}")
async def download_report(dataset_id: str):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    report = _sessions[dataset_id].get("pipeline", {}).get("analyst_report", {}).get("report", "No report available.")
    return PlainTextResponse(str(report), headers={"Content-Disposition": f"attachment; filename=Report_{dataset_id}.txt"})

@app.get("/download-clean-data/{dataset_id}")
async def download_clean_data(dataset_id: str):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    df = _sessions[dataset_id]["df"]
    csv_data = df.to_csv(index=False)
    return StreamingResponse(iter([csv_data]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=Clean_Data_{dataset_id}.csv"})

@app.post("/reprocess-dataset/{dataset_id}")
async def reprocess_dataset(dataset_id: str, sheet_name: str = Body(None)):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    # This would require the original file content, which we'd need to store.
    # For now, just rerun pipeline on current DF.
    df = _sessions[dataset_id]["df"]
    _sessions[dataset_id]["pipeline"] = run_pipeline(df)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
