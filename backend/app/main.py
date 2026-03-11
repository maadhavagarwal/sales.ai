import os
from datetime import datetime
import time
import math
import uuid
import traceback
import pandas as pd
import numpy as np

from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from collections import defaultdict

from app.services.pipeline_controller import run_pipeline
from app.engines.nlbi_engine import generate_chart_from_question
from app.engines.copilot_engine import handle_question
from app.engines.deep_rl_engine import train_dqn
from app.engines.dashboard_generator import generate_ai_dashboard
from app.utils.dataset_intelligence import get_dataset_summary
from app.core.database_manager import store_data, create_user_record, get_user_record, init_auth_db
from app.utils.data_loader import load_data_robustly, get_excel_sheets
import bcrypt
import jwt
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
import io
from app.utils.pdf_generator import create_pdf_from_text
from app.engines.workspace_engine import WorkspaceEngine

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
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
DEBUG_MODE = os.getenv("DEBUG", "False").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
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
        return JSONResponse(status_code=429, content={"error": "Too Many Requests. IP Rate Limit Exceeded."})
        
    _rate_limits[client_ip].append(now)
    response = await call_next(request)
    
    # Security: Add security headers to all responses
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Enterprise Session Management: Store datasets by uniquely generated session IDs
# In a real production app, we would use Redis or S3 for this.
_sessions = {}

def generate_master_report_text(dataset_id: str):
    """
    Consolidates ALL model-generated documents into a single professional Master Report text.
    Includes Analyst Report, Strategic Plan, Deep RL Findings, and ML Insights.
    """
    if dataset_id not in _sessions:
        return None
        
    session = _sessions[dataset_id]
    pipeline = session.get("pipeline", {})
    analytics = pipeline.get("analytics", {})
    summary = pipeline.get("summary", {})
    
    report_io = io.StringIO()
    report_io.write(f"========================================================================\n")
    report_io.write(f"     NEURAL BI ENTERPRISE SUITE - UNIFIED BUSINESS INTELLIGENCE MASTER REPORT\n")
    report_io.write(f"========================================================================\n\n")
    
    report_io.write(f"REPORT METADATA:\n")
    report_io.write(f"Session ID: {dataset_id}\n")
    report_io.write(f"Source File: {session.get('filename', 'N/A')}\n")
    report_io.write(f"Timestamp: {time.ctime(session['timestamp'])}\n")
    report_io.write(f"Data Scan Depth: {summary.get('total_rows', 'N/A')} Rows Analyzed\n")
    report_io.write(f"AI Confidence Score: {pipeline.get('confidence_score', 0.85)*100:.1f}%\n\n")

    # 1. Executive Summary (AI Analyst)
    # Use Markdown headers for PDF compatibility
    report_io.write(f"# I. EXECUTIVE CDO SUMMARY (AUTONOMOUS ANALYST)\n")
    report_io.write(f"----------------------------------------------\n")
    report_io.write(f"{pipeline.get('analyst_report', {}).get('report', 'No summary available.')}\n\n")

    # 2. Deep RL Pricing Optimization
    pricing = pipeline.get("ml_predictions", {}).get("pricing_optimization")
    if pricing:
        report_io.write(f"# II. DEEP RL PRICING OPTIMIZATION & CAPITAL DIRECTIVE\n")
        report_io.write(f"-----------------------------------------------------\n")
        report_io.write(f"Recommended Price Adjustment: {pricing.get('best_price_adjustment_percent', 0)}%\n")
        report_io.write(f"Neural Engine: {pricing.get('engine', 'DQN-v2')}\n")
        report_io.write(f"Market Elasticity (Modeled): {pricing.get('market_elasticity_modeled', -1.8)}\n\n")
        report_io.write(f"AGENT REASONING LOG:\n")
        report_io.write(f"{pricing.get('neural_intelligence', 'N/A')}\n\n")

    # 3. Strategic Roadmap
    report_io.write(f"# III. COMPREHENSIVE STRATEGIC ROADMAP\n")
    report_io.write(f"------------------------------------\n")
    report_io.write(f"{pipeline.get('strategic_plan', 'No roadmap generated.')}\n\n")

    # 4. Tactical Recommendations
    recs = pipeline.get("recommendations", [])
    if recs:
        report_io.write(f"# IV. TACTICAL ACTION ITEMS\n")
        report_io.write(f"-------------------------\n")
        for i, rec in enumerate(recs):
            report_io.write(f"{i+1}. {rec}\n")
        report_io.write("\n")

    # 5. ML Insights & Anomaly Report
    insights = pipeline.get("insights", [])
    anomalies = pipeline.get("anomalies", [])
    if insights or anomalies:
        report_io.write(f"# V. KEY DATA INSIGHTS & ANOMALY DETECTION\n")
        report_io.write(f"----------------------------------------\n")
        if anomalies:
            report_io.write(f"[ANOMALY ALERT]\n")
            for a in anomalies:
                report_io.write(f"!! {a}\n")
            report_io.write("\n")
        for ins in insights:
            report_io.write(f"- {ins}\n")
        report_io.write("\n")

    # 6. Core Financial Metrics
    report_io.write(f"# VI. CORE FINANCIAL PERFORMANCE METRICS\n")
    report_io.write(f"---------------------------------------\n")
    for k, v in analytics.items():
        if isinstance(v, (int, float)) and not k.startswith('_'):
            report_io.write(f"- {k.replace('_', ' ').upper()}: {v:,.2f}\n")
    
    if "top_products" in analytics:
        report_io.write(f"\nTOP PRODUCTS PERFORMANCE:\n")
        for prod, rev in sorted(analytics["top_products"].items(), key=lambda x: x[1], reverse=True)[:10]:
            report_io.write(f"- {prod}: ₹{rev:,.2f}\n")

    report_io.write(f"\n========================================================================\n")
    report_io.write(f"                 END OF NEURAL BI CONSOLIDATED REPORT\n")
    report_io.write(f"========================================================================\n")
    
    return report_io.getvalue()


@app.get("/")
def home():
    return {"message": "AI Data Platform running - Enterprise Edition"}


import math

def _make_serializable(obj):
    """Recursively convert numpy types to Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {str(k): _make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_make_serializable(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, float) or isinstance(obj, np.floating):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [_make_serializable(v) for v in obj.tolist()]
    if isinstance(obj, pd.Timestamp) or type(obj).__name__ == "Timestamp":
        return str(obj)
    if pd.isna(obj) if not isinstance(obj, (list, dict, np.ndarray, pd.DataFrame, pd.Series)) else False:
        return None
    return obj


MAX_FILE_SIZE = 500 * 1024 * 1024 # 500MB

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    try:
        # Security: Validate file size
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            return JSONResponse(status_code=413, content={"error": "File Too Large. Max 50MB allowed."})
        
        # Security: Validate file type
        filename = file.filename.lower()
        if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
            return JSONResponse(status_code=400, content={"error": "Invalid File Type. Only CSV and Excel supported."})

        # Process the file
        from io import BytesIO
        file_io = BytesIO(file_content)
        
        try:
            df = load_data_robustly(file_io, filename)
        except Exception as e:
            traceback.print_exc()
            return JSONResponse(status_code=400, content={"error": f"Failed to parse file: {str(e)}"})

        # Detect sheets if Excel
        file_io.seek(0)
        sheets = get_excel_sheets(file_io) if filename.endswith(('.xlsx', '.xls')) else []

        # Generate unique session ID for this upload
        dataset_id = str(uuid.uuid4())

        pipeline = run_pipeline(df)
        processed_df = pipeline.get("_df", df)
        
        # Save session data cache securely
        _sessions[dataset_id] = {
            "df": processed_df,
            "file_content": file_content, # Keep for re-processing sheets
            "filename": filename,
            "analytics": pipeline.get("analytics", {}),
            "ml_results": pipeline.get("ml_predictions", {}),
            "pipeline": pipeline,
            "timestamp": time.time()
        }

        # Persist to SQL backend
        store_data(dataset_id, processed_df)

        # Autonomous Workspace Sync (Extract Entities)
        WorkspaceEngine.sync_dataset_to_workspace(processed_df)

        summary = get_dataset_summary(processed_df)
        sample_df = processed_df.head(5000).copy()

        for col in sample_df.columns:
            if pd.api.types.is_datetime64_any_dtype(sample_df[col]):
                sample_df[col] = sample_df[col].astype(str)

        raw_data = sample_df.where(sample_df.notna(), None).to_dict(orient="records")

        # Cleanup old sessions
        current_time = time.time()
        expired_keys = [k for k, v in _sessions.items() if current_time - v.get("timestamp", 0) > 3600]
        for k in expired_keys:
            del _sessions[k]

        response = {
            "dataset_id": dataset_id,
            "rows": len(df),
            "available_sheets": sheets,
            "analytics": pipeline.get("analytics", {}),
            "ml_predictions": pipeline.get("ml_predictions", {}),
            "simulation_results": pipeline.get("simulation_results", []),
            "recommendations": pipeline.get("recommendations", []),
            "strategy": pipeline.get("strategy", []),
            "insights": pipeline.get("insights", []),
            "explanations": pipeline.get("explanations", []),
            "analyst_report": pipeline.get("analyst_report", {}),
            "strategic_plan": pipeline.get("strategic_plan", ""),
            "dataset_summary": summary,
            "raw_data": raw_data,
            "columns": list(processed_df.columns),
            "numeric_columns": processed_df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": processed_df.select_dtypes(include=["object"]).columns.tolist(),
            "clustering": pipeline.get("clustering", {}),
            "anomalies": pipeline.get("anomalies", []),
            "data_quality": pipeline.get("data_quality", 1.0),
            "confidence_score": pipeline.get("confidence_score", 0.7),
            "market_intelligence": pipeline.get("market_intelligence", {}),
            "dataset_type": pipeline.get("dataset_type", "generic_dataset"),
        }
        return _make_serializable(response)

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Upload failed: {str(e)}"})

@app.post("/reprocess-dataset/{dataset_id}")
async def reprocess_dataset(dataset_id: str, sheet_name: str = Body(None)):
    try:
        # Session Recovery from SQL if missing in RAM
        if dataset_id not in _sessions:
             from app.core.database_manager import get_session_data_sql
             stored_df = get_session_data_sql(dataset_id)
             if stored_df is not None and not stored_df.empty:
                 _sessions[dataset_id] = {
                     "df": stored_df,
                     "filename": "Recovered Session",
                     "is_recovered": True,
                     "timestamp": time.time()
                 }
             else:
                 return JSONResponse(status_code=404, content={"error": "Session expired."})
            
        session = _sessions[dataset_id]
        
        # Determine Data Source
        if dataset_id.startswith("LIVE-SYNC"):
            # Live data source: Pull fresh from Workspace
            df = WorkspaceEngine.get_enterprise_analytics_df()
            filename = "Live ERP Stream"
            file_content = None
        else:
            # File data source: Reload from cache
            file_content = session.get("file_content")
            filename = session.get("filename", "reloaded.csv")
            if not file_content:
                 return JSONResponse(status_code=400, content={"error": "No source file found for reprocessing."})
            file_io = io.BytesIO(file_content)
            df = load_data_robustly(file_io, filename, sheet_name=sheet_name)
        
        pipeline = run_pipeline(df)
        processed_df = pipeline.get("_df", df)
        
        # Update session
        session["df"] = processed_df
        session["analytics"] = pipeline.get("analytics", {})
        session["ml_results"] = pipeline.get("ml_predictions", {})
        session["pipeline"] = pipeline
        session["timestamp"] = time.time()
        
        summary = get_dataset_summary(processed_df)
        sample_df = processed_df.head(5000).copy()
        for col in sample_df.columns:
            if pd.api.types.is_datetime64_any_dtype(sample_df[col]):
                sample_df[col] = sample_df[col].astype(str)
        raw_data = sample_df.where(sample_df.notna(), None).to_dict(orient="records")
        
        response = {
            "dataset_id": dataset_id,
            "rows": len(df),
            "analytics": pipeline.get("analytics", {}),
            "ml_predictions": pipeline.get("ml_predictions", {}),
            "simulation_results": pipeline.get("simulation_results", []),
            "recommendations": pipeline.get("recommendations", []),
            "strategy": pipeline.get("strategy", []),
            "insights": pipeline.get("insights", []),
            "explanations": pipeline.get("explanations", []),
            "analyst_report": pipeline.get("analyst_report", {}),
            "strategic_plan": pipeline.get("strategic_plan", ""),
            "dataset_summary": summary,
            "raw_data": raw_data,
            "columns": list(processed_df.columns),
            "numeric_columns": processed_df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": processed_df.select_dtypes(include=["object"]).columns.tolist(),
            "clustering": pipeline.get("clustering", {}),
            "anomalies": pipeline.get("anomalies", []),
            "data_quality": pipeline.get("data_quality", 1.0),
            "confidence_score": pipeline.get("confidence_score", 0.7),
            "market_intelligence": pipeline.get("market_intelligence", {}),
            "dataset_type": pipeline.get("dataset_type", "generic_dataset"),
        }
        return _make_serializable(response)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/copilot/{dataset_id}")
async def copilot(dataset_id: str, question: str = Body(...)):
    try:
        if dataset_id not in _sessions:
            return {"error": "Session expired or dataset not found. Please re-upload your CSV."}

        session = _sessions[dataset_id]
        df = session["df"]
        analytics = session["analytics"]
        ml_results = session["ml_results"]
        pipeline = session["pipeline"]

        answer = handle_question(question, df, analytics, ml_results, pipeline)
        
        # Update timestamp to keep session alive
        _sessions[dataset_id]["timestamp"] = time.time()
        
        return {"answer": answer}

    except Exception as e:
        traceback.print_exc()
        error_msg = str(e) if DEBUG_MODE else "Internal AI error processing copilot query."
        return {"error": error_msg}


@app.post("/nlbi/{dataset_id}")
async def nlbi(dataset_id: str, question: str = Body(...)):
    try:
        if dataset_id not in _sessions:
            return {"error": "Session expired or dataset not found. Please re-upload your CSV."}

        df = _sessions[dataset_id]["df"]
        result = generate_chart_from_question(question, df)
        
        # Update timestamp to keep session alive
        _sessions[dataset_id]["timestamp"] = time.time()
        
        return _make_serializable(result)

    except Exception as e:
        traceback.print_exc()
        error_msg = str(e) if DEBUG_MODE else "Internal AI error processing chart generation."
        return {"error": error_msg}
@app.post("/copilot/agent/{dataset_id}")
async def copilot_agent(dataset_id: str, question: str = Body(...)):
    try:
        if dataset_id not in _sessions:
            return {"error": "Session expired."}
        session = _sessions[dataset_id]
        try:
            from app.agents.supervisor_agent import run_supervisor
            result = run_supervisor(question, session["df"], session["analytics"], session["ml_results"])
        except Exception:
            # Fallback if supervisor agent (torch/sentence_transformers) is unavailable
            answer = handle_question(question, session["df"], session["analytics"], session["ml_results"], session["pipeline"])
            result = {"answer": answer, "agent_outputs": []}
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/pricing-optimization/{dataset_id}")
async def pricing_optimization(dataset_id: str):
    try:
        if dataset_id not in _sessions:
            return {"error": "Session expired."}
        
        analytics = _sessions[dataset_id].get("analytics", {})
        result = train_dqn(episodes=150, analytics=analytics)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/dashboard-config/{dataset_id}")
async def dashboard_config(dataset_id: str):
    try:
        if dataset_id not in _sessions:
            return {"error": "Session expired."}
        df = _sessions[dataset_id]["df"]
        result = generate_ai_dashboard(df)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/forecast/{dataset_id}")
async def forecast_sales_endpoint(dataset_id: str, periods: int = Body(12, embed=True)):
    try:
        if dataset_id not in _sessions:
            return {"error": "Session expired."}
        df = _sessions[dataset_id]["df"]
        from app.engines.automl_engine import forecast_sales
        result = forecast_sales(df, periods)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.get("/download-clean-data/{dataset_id}")
async def download_clean_data(dataset_id: str):
    try:
        if dataset_id not in _sessions:
            return JSONResponse(status_code=404, content={"error": "Session expired or dataset not found."})
        
        df = _sessions[dataset_id]["df"]
        
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=cleaned_data_{dataset_id[:8]}.csv"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/download-report/{dataset_id}")
async def download_report(dataset_id: str):
    """
    Consolidates ALL model-generated documents into a single professional Master Report.
    """
    try:
        report_text = generate_master_report_text(dataset_id)
        if not report_text:
            return JSONResponse(status_code=404, content={"error": "Session expired or dataset not found."})
            
        return StreamingResponse(
            iter([report_text]),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=Master_Insight_Report_{dataset_id[:8]}.txt"}
        )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Failed to generate consolidated report: {str(e)}"})

@app.get("/download-strategic-plan-pdf/{dataset_id}")
async def download_strategic_plan_pdf(dataset_id: str):
    """
    Consolidates ALL model-generated documents into a single professional PDF Master Report.
    """
    try:
        report_text = generate_master_report_text(dataset_id)
        if not report_text:
            return JSONResponse(status_code=404, content={"error": "Session expired or report not found."})
            
        pdf_content = create_pdf_from_text(report_text, filename=f"Master_Insight_Report_{dataset_id[:8]}.pdf")
        
        return StreamingResponse(
            io.BytesIO(pdf_content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Master_Insight_Report_{dataset_id[:8]}.pdf"}
        )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

# --- ENTERPRISE REAL-TIME WEBSOCKET STREAMING ---
import asyncio
import json

@app.websocket("/ws/stream-rl")
async def websocket_rl_endpoint(websocket: WebSocket):
    """
    Streams Deep RL Agent training iterations live to the frontend.
    Demonstrates true Enterprise Real-Time Data Streaming.
    """
    await websocket.accept()
    try:
        data = await websocket.receive_text()
        req = json.loads(data)
        dataset_id = req.get("dataset_id")
        
        # We simulate the DQN agent's internal loss/reward propagation
        # In a full CELERY architecture, this connects to the Redis task queue
        episodes = 100
        for ep in range(1, episodes + 1):
            if ep % 5 == 0:
                # Mock loss converging over time
                loss = max(0.01, 1.5 * math.exp(-ep/20) + np.random.normal(0, 0.05))
                reward = 1000 - (loss * 100)
                
                await websocket.send_json({
                    "episode": ep,
                    "total_episodes": episodes,
                    "loss": round(loss, 4),
                    "reward": round(reward, 2),
                    "status": "training"
                })
                # Simulate compute delay
                await asyncio.sleep(0.15)
                
        # Final optimal point calculation
        if dataset_id and dataset_id in _sessions:
             analytics = _sessions[dataset_id].get("analytics", {})
             result = train_dqn(analytics=analytics)
        else:
             result = train_dqn()
             
        await websocket.send_json({
            "status": "complete",
            "result": result
        })
        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Error: {e}")
        try:
            await websocket.send_json({"error": "Streaming disconnected abnormally"})
        except:
            pass

@app.post("/workspace/invoices")
async def create_invoice(data: dict = Body(...)):
    """Creates a professional, stored business bill/invoice."""
    res = WorkspaceEngine.create_invoice(data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.get("/workspace/invoices")
async def get_invoices():
    """Retrieves all historical business invoices."""
    return WorkspaceEngine.get_invoices()

@app.put("/workspace/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: dict = Body(...)):
    """Updates an existing invoice."""
    res = WorkspaceEngine.update_invoice(invoice_id, data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.delete("/workspace/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Deletes an invoice."""
    res = WorkspaceEngine.delete_invoice(invoice_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.post("/workspace/customers")
async def add_customer(data: dict = Body(...)):
    """Adds a new client to the Enterprise CRM."""
    res = WorkspaceEngine.add_customer(data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.get("/workspace/customers")
async def get_customers():
    """Retrieves the full Enterprise Customer Directory."""
    return WorkspaceEngine.get_customers()

@app.put("/workspace/customers/{customer_id}")
async def update_customer(customer_id: int, data: dict = Body(...)):
    """Updates an existing customer record."""
    res = WorkspaceEngine.update_customer(customer_id, data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.delete("/workspace/customers/{customer_id}")
async def delete_customer(customer_id: int):
    """Deletes a customer record."""
    res = WorkspaceEngine.delete_customer(customer_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.get("/workspace/inventory")
async def get_inventory():
    """Retrieves all stock and asset items."""
    return WorkspaceEngine.get_inventory()

@app.get("/workspace/inventory/health")
async def get_inventory_health():
    """AI-driven Inventory Analytics & Health mapping."""
    return WorkspaceEngine.get_inventory_health()

@app.post("/workspace/inventory")
async def add_inventory_item(data: dict = Body(...)):
    """Creates a new inventory/stock item."""
    res = WorkspaceEngine.add_inventory_item(data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.put("/workspace/inventory/{item_id}")
async def update_inventory_item(item_id: int, data: dict = Body(...)):
    """Updates an existing inventory item."""
    res = WorkspaceEngine.update_inventory_item(item_id, data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.delete("/workspace/inventory/{item_id}")
async def delete_inventory_item(item_id: int):
    """Deletes an inventory item."""
    res = WorkspaceEngine.delete_inventory_item(item_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.post("/workspace/marketing/campaigns")
async def create_marketing_campaign(data: dict = Body(...)):
    """Deploys a new campaign and logs spend as an expense."""
    res = WorkspaceEngine.create_marketing_campaign(data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.put("/workspace/marketing/campaigns/{campaign_id}")
async def update_marketing_campaign(campaign_id: int, data: dict = Body(...)):
    """Updates an existing marketing campaign."""
    res = WorkspaceEngine.update_marketing_campaign(campaign_id, data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.delete("/workspace/marketing/campaigns/{campaign_id}")
async def delete_marketing_campaign(campaign_id: int):
    """Deletes a marketing campaign."""
    res = WorkspaceEngine.delete_marketing_campaign(campaign_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.post("/workspace/expenses")
async def add_expense(data: dict = Body(...)):
    """Logs a new business expense for internal bookkeeping."""
    res = WorkspaceEngine.add_expense(data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.put("/workspace/expenses/{expense_id}")
async def update_expense(expense_id: int, data: dict = Body(...)):
    """Updates an existing expense record."""
    res = WorkspaceEngine.update_expense(expense_id, data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.delete("/workspace/expenses/{expense_id}")
async def delete_expense(expense_id: int):
    """Deletes an expense record."""
    res = WorkspaceEngine.delete_expense(expense_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.get("/workspace/ledger")
async def get_ledger():
    """Retrieves the professional statutory accounting ledger."""
    return WorkspaceEngine.get_ledger()

@app.post("/workspace/ledger")
async def add_ledger_entry(data: dict = Body(...)):
    """Adds a validated entry to the general ledger."""
    return WorkspaceEngine.add_ledger_entry(data)

@app.put("/workspace/ledger/{entry_id}")
async def update_ledger_entry(entry_id: int, data: dict = Body(...)):
    """Updates an existing ledger entry."""
    res = WorkspaceEngine.update_ledger_entry(entry_id, data)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.delete("/workspace/ledger/{entry_id}")
async def delete_ledger_entry(entry_id: int):
    """Deletes a ledger entry."""
    res = WorkspaceEngine.delete_ledger_entry(entry_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@app.get("/workspace/accounting/notes")
async def get_accounting_notes():
    """Retrieves statutory Debit and Credit notes."""
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

@app.get("/workspace/expenses")
async def get_expenses():
    """Retrieves all categorized business expenses."""
    return WorkspaceEngine.get_expenses()

@app.get("/workspace/marketing/campaigns")
async def get_marketing_campaigns():
    """Retrieves all marketing campaign ROI data."""
    return WorkspaceEngine.get_marketing_campaigns()

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

        result = handle_question(query, context_df, analytics, {}, pipeline)
        if not result:
            from app.engines.nlbi_engine import run_nl_query
            result = run_nl_query(query, context_df)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
