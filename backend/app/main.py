import os
import time
import math
import uuid
import traceback
import pandas as pd
import numpy as np

from fastapi import FastAPI, UploadFile, File, Body, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from collections import defaultdict

from app.services.pipeline_controller import run_pipeline
from app.engines.nlbi_engine import generate_chart_from_question
from app.engines.copilot_engine import handle_question
from app.agents.supervisor_agent import run_supervisor
from app.engines.deep_rl_engine import train_dqn
from app.engines.dashboard_generator import generate_ai_dashboard
from app.utils.dataset_intelligence import get_dataset_summary
from app.core.database_manager import store_data, create_user_record, get_user_record, init_auth_db
from app.utils.data_loader import load_data_robustly, get_excel_sheets
import bcrypt
import jwt
from fastapi.responses import JSONResponse, StreamingResponse
import io
from app.utils.pdf_generator import create_pdf_from_text

app = FastAPI(title="NeuralBI Enterprise API", version="2.1.0")

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
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,*").split(",")
DEBUG_MODE = os.getenv("DEBUG", "False").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
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
        }
        return _make_serializable(response)

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Upload failed: {str(e)}"})

@app.post("/reprocess-dataset/{dataset_id}")
async def reprocess_dataset(dataset_id: str, sheet_name: str = Body(None)):
    try:
        if dataset_id not in _sessions:
            return JSONResponse(status_code=404, content={"error": "Session expired."})
            
        session = _sessions[dataset_id]
        file_content = session["file_content"]
        filename = session["filename"]
        
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
        result = run_supervisor(question, session["df"], session["analytics"], session["ml_results"])
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
    try:
        if dataset_id not in _sessions:
            return JSONResponse(status_code=404, content={"error": "Session expired."})
            
        session = _sessions[dataset_id]
        analytics = session["analytics"]
        report_text = session.get("analyst_report", {}).get("report", "No report available.")
        summary = session.get("dataset_summary", {})
        
        # Create a formatted text report
        report_io = io.StringIO()
        report_io.write(f"NEURAL BI - EXECUTIVE SALES REPORT\n")
        report_io.write(f"==================================\n\n")
        report_io.write(f"Session ID: {dataset_id}\n")
        report_io.write(f"Timestamp: {time.ctime(session['timestamp'])}\n\n")
        
        report_io.write(f"1. EXECUTIVE SUMMARY\n")
        report_io.write(f"--------------------\n")
        report_io.write(f"{report_text}\n\n")
        
        report_io.write(f"2. KEY METRICS\n")
        report_io.write(f"--------------\n")
        for k, v in analytics.items():
            if isinstance(v, (int, float)):
                report_io.write(f"- {k.replace('_', ' ').title()}: {v:,.2f}\n")
        report_io.write("\n")
        
        if "top_products" in analytics:
            report_io.write(f"3. TOP PRODUCTS\n")
            report_io.write(f"---------------\n")
            for prod, rev in analytics["top_products"].items():
                report_io.write(f"- {prod}: ${rev:,.2f}\n")
            report_io.write("\n")
            
        if "region_sales" in analytics:
            report_io.write(f"4. REGIONAL PERFORMANCE\n")
            report_io.write(f"-----------------------\n")
            for reg, rev in analytics["region_sales"].items():
                report_io.write(f"- {reg}: ${rev:,.2f}\n")
            report_io.write("\n")
            
        report_io.write(f"5. DATASET PROFILE\n")
        report_io.write(f"------------------\n")
        report_io.write(f"- Total Rows: {summary.get('total_rows', 'N/A')}\n")
        report_io.write(f"- Total Columns: {summary.get('total_columns', 'N/A')}\n")
        
        report_io.seek(0)
        return StreamingResponse(
            iter([report_io.getvalue()]),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=sales_report_{dataset_id[:8]}.txt"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/download-strategic-plan-pdf/{dataset_id}")
async def download_strategic_plan_pdf(dataset_id: str):
    try:
        if dataset_id not in _sessions:
            return JSONResponse(status_code=404, content={"error": "Session expired."})
            
        session = _sessions[dataset_id]
        plan_text = session.get("results", {}).get("strategic_plan", "")
        
        if not plan_text:
            return JSONResponse(status_code=404, content={"error": "Strategic plan not generated."})
            
        pdf_content = create_pdf_from_text(plan_text)
        
        return StreamingResponse(
            io.BytesIO(pdf_content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=strategic_plan_{dataset_id[:8]}.pdf"}
        )
    except Exception as e:
        print(f"PDF Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
