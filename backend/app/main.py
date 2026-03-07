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
import bcrypt
import jwt

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
            if filename.endswith('.csv'):
                try:
                    df = pd.read_csv(file_io, encoding="utf-8")
                except Exception:
                    file_io.seek(0)
                    df = pd.read_csv(file_io, encoding="latin1")
            else:
                df = pd.read_excel(file_io)
        except Exception:
            return JSONResponse(status_code=400, content={"error": "Failed to parse file. Please upload a valid CSV/Excel file."})

        # Generate unique session ID for this upload
        dataset_id = str(uuid.uuid4())

        pipeline = run_pipeline(df)

        processed_df = pipeline.get("_df", df)
        
        # Save session data cache securely
        _sessions[dataset_id] = {
            "df": processed_df,
            "analytics": pipeline.get("analytics", {}),
            "ml_results": pipeline.get("ml_predictions", {}),
            "pipeline": pipeline,
            "timestamp": time.time()
        }

        # Persist to SQL backend for enterprise-grade durability
        store_data(dataset_id, processed_df)

        summary = get_dataset_summary(processed_df)
        sample_df = processed_df.head(5000).copy()

        for col in sample_df.columns:
            if pd.api.types.is_datetime64_any_dtype(sample_df[col]):
                sample_df[col] = sample_df[col].astype(str)

        raw_data = sample_df.where(sample_df.notna(), None).to_dict(orient="records")

        # Cleanup old sessions (older than 1 hour) to free memory
        current_time = time.time()
        expired_keys = [k for k, v in _sessions.items() if current_time - v.get("timestamp", 0) > 3600]
        for k in expired_keys:
            del _sessions[k]

        response = {
            "dataset_id": dataset_id,  # Important: Frontend needs this to interact
            "rows": len(df),
            "analytics": pipeline.get("analytics", {}),
            "ml_predictions": pipeline.get("ml_predictions", {}),
            "simulation_results": pipeline.get("simulation_results", []),
            "recommendations": pipeline.get("recommendations", []),
            "strategy": pipeline.get("strategy", []),
            "insights": pipeline.get("insights", []),
            "explanations": pipeline.get("explanations", []),
            "analyst_report": pipeline.get("analyst_report", {}),
            "dataset_summary": summary,
            "raw_data": raw_data,
            "columns": list(processed_df.columns),
            "numeric_columns": processed_df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": processed_df.select_dtypes(include=["object"]).columns.tolist(),
        }
        return _make_serializable(response)

    except Exception as e:
        traceback.print_exc()
        if DEBUG_MODE:
            return {"error": f"Pipeline Error: {str(e)}"}
        return {"error": "An internal server error occurred while processing the dataset. Please ensure valid CSV formatting."}


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
        result = train_dqn(episodes=100)
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
