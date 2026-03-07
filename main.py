from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import traceback
import uuid
import time

from pipeline_controller import run_pipeline
from nlbi_engine import generate_chart_from_question
from copilot_engine import handle_question
from dataset_intelligence import get_dataset_summary

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    try:
        try:
            df = pd.read_csv(file.file, encoding="utf-8")
        except Exception:
            file.file.seek(0)
            df = pd.read_csv(file.file, encoding="latin1")

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
        return {"error": str(e)}


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
        return {"error": str(e)}


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
        return {"error": str(e)}
