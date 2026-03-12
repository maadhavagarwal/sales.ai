import os
import uuid
import time
import math
import io
import traceback
from datetime import datetime
from collections import defaultdict

import pandas as pd
import numpy as np
import sqlite3
import bcrypt
import jwt
from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse

# --- Enterprise Service Imports ---
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

# --- TELEMETRY ---
try:
    import sentry_sdk
    sentry_sdk.init(
        dsn="https://mock_public_key@mock_sentry.io/12345", 
        traces_sample_rate=1.0,
        environment="production"
    )
except ImportError:
    sentry_sdk = None

try:
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:
    Instrumentator = None

app = FastAPI(title="NeuralBI Enterprise API", version="3.7.0")

if Instrumentator:
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# --- INITIALIZATION ---
# Using the startup event for cleaner lifecycle management
@app.on_event("startup")
async def startup_event():
    try:
        init_auth_db()
        print("Corporate Auth Database Initialized.")
    except Exception as e:
        print(f"Auth DB Init Error: {e}")

# --- GLOBAL & CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "neural_bi_enterprise_secret_2026")
ALGORITHM = "HS256"
_sessions = {}

# --- HELPER: SERIALIZATION ---
def _make_serializable(obj):
    if isinstance(obj, dict):
        return {str(k): _make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, np.ndarray)):
        return [_make_serializable(v) for v in obj]
    if isinstance(obj, (np.integer, int)):
        return int(obj)
    if isinstance(obj, (np.floating, float, complex)):
        if not math.isfinite(obj.real): return None
        return float(obj.real)
    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    if isinstance(obj, (datetime, np.datetime64, pd.Timestamp)):
        return str(obj)
    if pd.isna(obj):
        return None
    return obj

# --- HELPER: SAMPLING ---
def _prepare_runtime_dataframe(df: pd.DataFrame, max_rows: int = 20000) -> pd.DataFrame:
    if len(df) <= max_rows: return df
    sample_idx = np.linspace(0, len(df) - 1, num=max_rows, dtype=int)
    return df.iloc[sample_idx].copy()

# --- HELPER: DASHBOARD RESPONSE ---
def _build_dashboard_response(dataset_id: str, df: pd.DataFrame, pipeline: dict, filename=None, is_live=False, available_sheets=None, total_rows=None):
    summary = get_dataset_summary(df)
    
    sample_df = df.head(100).copy()
    for col in sample_df.columns:
        if pd.api.types.is_datetime64_any_dtype(sample_df[col]):
            sample_df[col] = sample_df[col].astype(str)
    raw_preview = sample_df.where(sample_df.notna(), None).to_dict(orient="records")

    response = {
        "dataset_id": dataset_id,
        "filename": filename,
        "is_live": is_live,
        "rows": total_rows if total_rows is not None else len(df),
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
        "raw_data": raw_preview,
        "columns": list(df.columns),
        "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
        "categorical_columns": df.select_dtypes(include=["object"]).columns.tolist(),
        "dataset_type": pipeline.get("dataset_type"),
        "market_intelligence": pipeline.get("market_intelligence", {}),
        "available_sheets": available_sheets or [],
    }
    return _make_serializable(response)

# --- CORS ---
def _collect_allowed_origins():
    raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    for env_key in ("FRONTEND_URL", "NEXT_PUBLIC_SITE_URL", "APP_URL"):
        value = os.getenv(env_key, "").strip()
        if value and value not in origins: origins.append(value)
    # Common NeuralBI deployment URLs
    origins.extend(["https://sales-ai-two-omega.vercel.app", "https://neuralbi.vercel.app", "https://neuralbi-backend.onrender.com"])
    return list(set(origins))

ALLOWED_ORIGINS = _collect_allowed_origins()
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX", r"https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.onrender\.com)(:\d+)?")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RATE LIMITING ---
_rate_limits = defaultdict(list)
RATE_LIMIT_MAX_REQUESTS = 100
RATE_LIMIT_WINDOW_SEC = 60

@app.middleware("http")
async def rate_limiter_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    if client_ip in {"127.0.0.1", "::1", "localhost"}:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response
    _rate_limits[client_ip] = [t for t in _rate_limits[client_ip] if now - t < RATE_LIMIT_WINDOW_SEC]
    if len(_rate_limits[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(status_code=429, content={"error": "Too many requests. Please slow down."})
    _rate_limits[client_ip].append(now)
    return await call_next(request)

# --- SYSTEM & ROOT ---
@app.get("/")
async def root():
    return {"status": "Enterprise NeuralBI Backend Online", "timestamp": datetime.now().isoformat()}

@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "engines": {
            "workspace": "active",
            "financial": "active",
            "ai_pipeline": "active"
        }
    }

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

# --- DATA UPLOAD & PIPELINE ---
@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    try:
        content = await file.read()
        file_io = io.BytesIO(content)
        df = load_data_robustly(file_io, file.filename)
        if df.empty: raise HTTPException(status_code=400, detail="The file is empty or corrupted.")
        runtime_df = _prepare_runtime_dataframe(df)
        available_sheets = get_excel_sheets(file_io) if file.filename.lower().endswith((".xlsx", ".xls")) else []
        res = WorkspaceEngine.sync_dataset_to_workspace(df)
        if res.get("status") == "error": raise HTTPException(status_code=500, detail=res.get("message"))
        dataset_id = f"UPLOAD-{uuid.uuid4().hex[:6].upper()}"
        pipeline = run_pipeline(runtime_df)
        _sessions[dataset_id] = {
            "df": runtime_df, "filename": file.filename, "timestamp": time.time(),
            "pipeline": pipeline, "available_sheets": available_sheets,
        }
        build_dataset_index(runtime_df)
        store_data(dataset_id, df)
        response = _build_dashboard_response(dataset_id, runtime_df, pipeline, filename=file.filename, available_sheets=available_sheets, total_rows=len(df))
        response.update({"status": res.get("status", "success"), "message": res.get("message", "")})
        return response
    except Exception as e:
        traceback.print_exc(); raise HTTPException(status_code=500, detail=str(e))

# --- WORKSPACE CORE ENDPOINTS ---
@app.get("/workspace/invoices")
async def get_invoices(): return WorkspaceEngine.get_invoices()
@app.post("/workspace/invoices")
async def create_invoice(data: dict = Body(...)): return WorkspaceEngine.create_invoice(data)
@app.put("/workspace/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: dict = Body(...)): return WorkspaceEngine.update_invoice(invoice_id, data)
@app.delete("/workspace/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str): return WorkspaceEngine.delete_invoice(invoice_id)

@app.get("/workspace/customers")
async def get_customers(): return WorkspaceEngine.get_customers()
@app.post("/workspace/customers")
async def add_customer(data: dict = Body(...)): return WorkspaceEngine.add_customer(data)
@app.put("/workspace/customers/{customer_id}")
async def update_customer(customer_id: int, data: dict = Body(...)): return WorkspaceEngine.update_customer(customer_id, data)
@app.delete("/workspace/customers/{customer_id}")
async def delete_customer(customer_id: int): return WorkspaceEngine.delete_customer(customer_id)

@app.get("/workspace/inventory")
async def get_inventory(): return WorkspaceEngine.get_inventory()
@app.get("/workspace/inventory/health")
async def get_inventory_health(): return WorkspaceEngine.get_inventory_health()
@app.post("/workspace/inventory")
async def add_inventory_item(data: dict = Body(...)): return WorkspaceEngine.add_inventory_item(data)
@app.put("/workspace/inventory/{item_id}")
async def update_inventory_item(item_id: int, data: dict = Body(...)): return WorkspaceEngine.update_inventory_item(item_id, data)
@app.delete("/workspace/inventory/{item_id}")
async def delete_inventory_item(item_id: int): return WorkspaceEngine.delete_inventory_item(item_id)

@app.get("/workspace/expenses")
async def get_expenses(): return WorkspaceEngine.get_expenses()
@app.post("/workspace/expenses")
async def add_expense_post(data: dict = Body(...)): return WorkspaceEngine.add_expense(data)
@app.put("/workspace/expenses/{expense_id}")
async def update_expense(expense_id: int, data: dict = Body(...)): return WorkspaceEngine.update_expense(expense_id, data)
@app.delete("/workspace/expenses/{expense_id}")
async def delete_expense(expense_id: int): return WorkspaceEngine.delete_expense(expense_id)

@app.get("/workspace/ledger")
async def get_ledger(): return WorkspaceEngine.get_ledger()
@app.post("/workspace/ledger")
async def add_ledger_entry(data: dict = Body(...)): return WorkspaceEngine.add_ledger_entry(data)
@app.put("/workspace/ledger/{entry_id}")
async def update_ledger_entry(entry_id: int, data: dict = Body(...)): return WorkspaceEngine.update_ledger_entry(entry_id, data)
@app.delete("/workspace/ledger/{entry_id}")
async def delete_ledger_entry(entry_id: int): return WorkspaceEngine.delete_ledger_entry(entry_id)

@app.get("/workspace/accounting/notes")
async def get_accounting_notes(): return WorkspaceEngine.get_accounting_notes()
@app.post("/workspace/accounting/notes")
async def add_accounting_note(data: dict = Body(...)): return WorkspaceEngine.add_accounting_note(data)
@app.put("/workspace/accounting/notes/{note_id}")
async def update_accounting_note(note_id: int, data: dict = Body(...)): return WorkspaceEngine.update_accounting_note(note_id, data)
@app.delete("/workspace/accounting/notes/{note_id}")
async def delete_accounting_note(note_id: int): return WorkspaceEngine.delete_accounting_note(note_id)

@app.get("/workspace/accounting/statements")
async def get_financial_statements(): return WorkspaceEngine.get_financial_statements()
@app.get("/workspace/marketing/campaigns")
async def get_marketing_campaigns(): return WorkspaceEngine.get_marketing_campaigns()
@app.post("/workspace/marketing/campaigns")
async def create_marketing_campaign(data: dict = Body(...)): return WorkspaceEngine.create_marketing_campaign(data)
@app.put("/workspace/marketing/campaigns/{id}")
async def update_marketing_campaign(id: int, data: dict = Body(...)): return WorkspaceEngine.update_marketing_campaign(id, data)
@app.delete("/workspace/marketing/campaigns/{id}")
async def delete_marketing_campaign(id: int): return WorkspaceEngine.delete_marketing_campaign(id)

@app.get("/workspace/accounting/daybook")
async def get_daybook(): return WorkspaceEngine.get_daybook()
@app.get("/workspace/accounting/trial-balance")
async def get_trial_balance(): return WorkspaceEngine.get_trial_balance()
@app.get("/workspace/accounting/pl")
async def get_pl_statement(): return WorkspaceEngine.get_pl_statement()
@app.get("/workspace/accounting/balance-sheet")
async def get_balance_sheet(): return WorkspaceEngine.get_balance_sheet()
@app.get("/workspace/accounting/customer-ledger/{customer_id}")
async def get_customer_ledger(customer_id: str): return WorkspaceEngine.get_customer_ledger(customer_id)
@app.post("/workspace/accounting/payments")
async def record_payment(data: dict = Body(...)): return WorkspaceEngine.record_payment(data)
@app.post("/workspace/accounting/reconcile")
async def reconcile_bank_statement(data: dict = Body(...)): return WorkspaceEngine.reconcile_bank_statement(data.get("entries", []))
@app.get("/workspace/accounting/gst")
async def get_gst_reports(): return WorkspaceEngine.get_gst_reports()
@app.get("/workspace/accounting/cfo-report")
async def get_cfo_report(): return WorkspaceEngine.get_cfo_health_report()

@app.post("/workspace/accounting/derivatives")
async def get_derivatives_snapshot(data: dict = Body(default={})):
    try:
        return DerivativesEngine.get_derivatives_snapshot(
            underlying=data.get("underlying", "NIFTY"), expiry=data.get("expiry"),
            portfolio_value=float(data.get("portfolio_value", 10_000_000)),
            portfolio_beta=float(data.get("portfolio_beta", 0.95)),
            hedge_ratio_target=float(data.get("hedge_ratio_target", 1.0)),
        )
    except Exception as e: traceback.print_exc(); raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/accounting/reminders/{invoice_id}")
async def send_invoice_reminder(invoice_id: str): return WorkspaceEngine.send_payment_reminder(invoice_id)

@app.get("/dashboard/sync-workspace")
async def sync_workspace_to_dashboard():
    try:
        df = WorkspaceEngine.get_enterprise_analytics_df()
        if df.empty: return JSONResponse(status_code=400, content={"error": "No data found."})
        pipeline = run_pipeline(df); dataset_id = f"LIVE-SYNC-{uuid.uuid4().hex[:6].upper()}"
        build_dataset_index(df); store_data(dataset_id, df)
        _sessions[dataset_id] = {"df": df, "filename": "Live ERP Stream", "timestamp": time.time(), "pipeline": pipeline}
        return _build_dashboard_response(dataset_id, df, pipeline, filename="Live ERP Stream", is_live=True, total_rows=len(df))
    except Exception as e: traceback.print_exc(); return JSONResponse(status_code=500, content={"error": str(e)})

# --- EXPORTS ---
@app.get("/workspace/export/{table_name}")
async def export_workspace_data(table_name: str):
    valid_tables = ["invoices", "customers", "inventory", "expenses", "ledger", "marketing_campaigns", "notes"]
    if table_name == "marketing": table_name = "marketing_campaigns"
    if table_name not in valid_tables:
        reports = {"trial_balance": WorkspaceEngine.export_trial_balance, "daybook": WorkspaceEngine.export_daybook, 
                  "p_and_l": WorkspaceEngine.export_pl_statement, "balance_sheet": WorkspaceEngine.export_balance_sheet}
        if table_name in reports: csv_data = reports[table_name]()
        else: raise HTTPException(status_code=400, detail="Invalid table.")
    else: csv_data = WorkspaceEngine.export_to_csv(table_name)
    return StreamingResponse(iter([csv_data]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={table_name}.csv"})

@app.get("/workspace/export/customer-ledger/{customer_id}")
async def export_customer_ledger(customer_id: str):
    csv_data = WorkspaceEngine.export_customer_ledger(customer_id)
    return StreamingResponse(iter([csv_data]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=ledger_{customer_id}.csv"})

@app.get("/workspace/business-report/download")
async def download_consolidated_report():
    report_text = WorkspaceEngine.generate_consolidated_business_report()
    return PlainTextResponse(report_text, headers={"Content-Disposition": "attachment; filename=NeuralBI_Report.txt"})

@app.get("/workspace/usage-stats")
async def get_usage_stats():
    try:
        conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
        logs = conn.execute("SELECT module, COUNT(*) as count FROM usage_logs GROUP BY module ORDER BY count DESC").fetchall()
        conn.close(); return [dict(l) for l in logs]
    except Exception as e: print(f"Usage Stats Error: {e}"); return []

# --- AI & COPILOT ENDPOINTS ---
@app.post("/copilot-chat")
async def copilot_chat(request: Request):
    body = await request.json(); query = body.get("query", ""); dataset_id = body.get("dataset_id")
    if not query: return {"answer": "Listening...", "suggested_questions": ["Summarize business health"]}
    context_df = _sessions[dataset_id]["df"] if dataset_id in _sessions else WorkspaceEngine.get_enterprise_analytics_df()
    pipeline = _sessions[dataset_id]["pipeline"] if dataset_id in _sessions else {}
    try:
        WorkspaceEngine.log_usage("Copilot", f"Query: {query[:50]}")
        if context_df is None or context_df.empty: return {"answer": "No context available. Upload or sync data."}
        ans = handle_question(query, context_df, pipeline.get("analytics", {}), pipeline.get("ml_predictions", {}), pipeline)
        if not ans: ans = run_nlbi_pipeline(query, context_df)
        return {"answer": ans, "context_rows": int(len(context_df)), "suggested_questions": ["Summarize trends", "Show top performers"]}
    except Exception as e: return {"answer": f"Error: {str(e)}", "suggested_questions": []}

@app.post("/copilot/{dataset_id}")
async def ask_copilot(dataset_id: str, question: str = Body(...)):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    s = _sessions[dataset_id]; p = s.get("pipeline", {})
    return {"answer": handle_question(question, s["df"], p.get("analytics", {}), p.get("ml_predictions", {}), p)}

@app.post("/copilot/agent/{dataset_id}")
async def ask_copilot_agent(dataset_id: str, question: str = Body(...)):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    s = _sessions[dataset_id]; p = s.get("pipeline", {})
    ans = handle_question(question, s["df"], p.get("analytics", {}), p.get("ml_predictions", {}), p)
    return {"answer": ans, "agent_outputs": ["Loaded context.", "Analyzed signals."], "suggested_questions": ["Summarize data"]}

@app.post("/nlbi/{dataset_id}")
async def ask_nlbi(dataset_id: str, question: str = Body(...)):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    return {"answer": run_nlbi_pipeline(question, _sessions[dataset_id]["df"])}

@app.post("/pricing-optimization/{dataset_id}")
async def get_pricing_opt(dataset_id: str):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    return _sessions[dataset_id].get("pipeline", {}).get("ml_predictions", {}).get("pricing_optimization", {})

@app.post("/forecast/{dataset_id}")
async def get_forecast(dataset_id: str, payload: dict = Body(default={})):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    periods = max(1, min(int(payload.get("periods", 30) or 30), 365))
    s = _sessions[dataset_id]; p = s.get("pipeline", {})
    forecast = p.get("ml_predictions", {}).get("time_series_forecast")
    if not forecast:
        from app.models.time_series_forecaster import forecast_revenue
        forecast = forecast_revenue(s["df"], days_ahead=periods)
        p.setdefault("ml_predictions", {})["time_series_forecast"] = forecast
    return {"forecast": forecast[:periods] if isinstance(forecast, list) else [], "r2_score": 0.0}

@app.post("/dashboard-config/{dataset_id}")
async def get_dashboard_config(dataset_id: str):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    return generate_ai_dashboard(_sessions[dataset_id]["df"])

# --- AI DATA DOWNLOADS ---
@app.get("/download-report/{dataset_id}")
async def download_report(dataset_id: str):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    rep = _sessions[dataset_id].get("pipeline", {}).get("analyst_report", {}).get("report", "No report.")
    return PlainTextResponse(str(rep), headers={"Content-Disposition": f"attachment; filename=Report_{dataset_id}.txt"})

@app.get("/download-strategic-plan-pdf/{dataset_id}")
async def download_strategic_plan_pdf(dataset_id: str):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    plan = _sessions[dataset_id].get("pipeline", {}).get("strategic_plan", "No plan available.")
    return StreamingResponse(iter([create_pdf_from_text(str(plan))]), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Strategy_{dataset_id}.pdf"})

@app.get("/download-clean-data/{dataset_id}")
async def download_clean_data(dataset_id: str):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    return StreamingResponse(iter([_sessions[dataset_id]["df"].to_csv(index=False)]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=Data_{dataset_id}.csv"})

@app.post("/reprocess-dataset/{dataset_id}")
async def reprocess_dataset(dataset_id: str):
    if dataset_id not in _sessions: raise HTTPException(status_code=404)
    df = _sessions[dataset_id]["df"]; pipeline = run_pipeline(df)
    _sessions[dataset_id]["pipeline"] = pipeline
    return _build_dashboard_response(dataset_id, df, pipeline, filename=_sessions[dataset_id].get("filename"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
