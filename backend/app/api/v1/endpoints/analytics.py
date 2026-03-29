from fastapi import APIRouter, Depends, Body, File, UploadFile, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
import asyncio
from typing import List, Dict, Any, Optional, cast
import os
import io
import time
import traceback
import pandas as pd
import numpy as np
import jwt

from app.api.v1.deps import get_current_user

_WS_JWT_SECRET = os.getenv("SECRET_KEY", "9f4e2b8a6d1c3f7e5a9b2d4c6e8f0a1b7c9d2e4f6a8b0c3d")
_WS_JWT_ALG = "HS256"
from app.utils.data_loader import get_excel_sheets, load_data_robustly
from app.services.file_persistence import get_file_storage
from app.services.pipeline_controller import run_pipeline
from app.utils.dataset_intelligence import get_dataset_summary
from datetime import datetime
from app.engines.workspace_engine import WorkspaceEngine

router = APIRouter()

# Memory optimization mode
LIGHTWEIGHT_MODE = (
    os.getenv("NEURALBI_LIGHTWEIGHT_MODE", "false").lower() == "true"
)

_sessions: Dict[str, Any] = {}
_active_websockets: List[WebSocket] = []
_live_data_state: Dict[str, Any] = {
    "kpis": {
        "total_revenue": 2500000.0,
        "monthly_growth": 8.5,
        "active_customers": 145,
        "inventory_turnover": 12.3,
        "cash_flow": 450000.0,
        "profit_margin": 18.7,
    },
    "last_updated": None,
}

@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
):
    allowed_extensions = {".csv", ".xlsx", ".xls"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type {ext} not allowed. Please use .csv or .xlsx",
        )

    try:
        content = await file.read()
        file_io = io.BytesIO(content)
        df = load_data_robustly(file_io, file.filename)
        
        if df.empty:
            raise HTTPException(
                status_code=400, detail="The file is empty or corrupted."
            )

        runtime_df = _prepare_runtime_dataframe(df)
        available_sheets = get_excel_sheets(file_io) if ext != ".csv" else []
        
        metadata = {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns),
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": df.select_dtypes(
                include=["object"]
            ).columns.tolist(),
            "available_sheets": available_sheets,
        }
        
        file_storage = get_file_storage()
        user_id = current_user.get("user_id", current_user.get("email", "anonymous"))
        
        storage_result = file_storage.save_file(
            user_id=user_id,
            file_content=content,
            filename=file.filename,
            file_type=ext.strip("."),
            metadata=metadata
        )
        
        dataset_id = storage_result["dataset_id"]

        initial_response = {
            "dataset_id": dataset_id,
            "status": "processing",
            "rows": len(df),
            "columns": list(df.columns),
            "filename": file.filename,
            "available_sheets": available_sheets,
            "message": f"File uploaded successfully for account {user_id}. Processing AI insights...",
            "persistent": True
        }

        _sessions[dataset_id] = {
            "df": runtime_df,
            "filename": file.filename,
            "timestamp": time.time(),
            "status": "processing",
            "available_sheets": available_sheets,
            "user_id": user_id,
            "persistent": True,
        }

        background_tasks.add_task(
            _process_dataset_background, dataset_id, df, file.filename, available_sheets
        )

        return initial_response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


def _process_dataset_background(
    dataset_id: str, df: pd.DataFrame, filename: str, available_sheets: list
):
    try:
        start_time = time.time()
        pipeline = run_pipeline(df)

        if dataset_id in _sessions:
            _sessions[dataset_id].update(
                {
                    "pipeline": pipeline,
                    "status": "completed",
                    "processed_at": time.time(),
                    "execution_time": time.time() - start_time,
                }
            )
    except Exception as e:
        traceback.print_exc()
        if dataset_id in _sessions:
            _sessions[dataset_id]["status"] = "error"
            _sessions[dataset_id]["error"] = str(e)


@router.get("/status/{dataset_id}")
async def get_upload_status(dataset_id: str, current_user: dict = Depends(get_current_user)):
    if dataset_id not in _sessions:
        raise HTTPException(status_code=404, detail="Dataset not found")

    session = _sessions[dataset_id]
    status = session.get("status", "unknown")

    if status == "completed":
        response = _build_dashboard_response(
            dataset_id,
            cast(pd.DataFrame, session["df"]),
            cast(Dict[Any, Any], session["pipeline"]),
            filename=cast(str, session.get("filename")),
            available_sheets=cast(List[str], session.get("available_sheets", [])),
            total_rows=len(cast(pd.DataFrame, session["df"])),
        )
        response["status"] = "completed"
        return response
    
    return {
        "dataset_id": dataset_id,
        "status": status,
        "filename": session.get("filename"),
    }


@router.get("/live-kpis")
async def get_live_kpis(current_user: dict = Depends(get_current_user)):
    try:
        real_metrics = WorkspaceEngine.get_live_kpi_metrics(current_user.get("company_id"))
        _live_data_state["kpis"] = real_metrics
        _live_data_state["last_updated"] = datetime.utcnow().isoformat()
    except Exception as e:
        print(f"KPI Update Error: {e}")
    return _live_data_state


@router.websocket("/ws/live-kpis")
async def websocket_live_kpis(websocket: WebSocket):
    """Real-time KPI stream. Browsers cannot set Authorization on WebSocket; pass ?token= JWT."""
    token = websocket.query_params.get("token")
    if token:
        try:
            jwt.decode(token, _WS_JWT_SECRET, algorithms=[_WS_JWT_ALG])
        except jwt.PyJWTError:
            await websocket.close(code=1008)
            return
    await websocket.accept()
    _active_websockets.append(websocket)
    try:
        # Send initial state immediately upon connection
        await websocket.send_json(_live_data_state)
        while True:
            # Keep connection alive, listen for any client messages if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in _active_websockets:
            _active_websockets.remove(websocket)


async def _update_live_data_from_db():
    """Async background job that pulls real business metrics from the DB and broadcasts via WebSockets."""
    while True:
        try:
            # Re-fetch real metrics from WorkspaceEngine
            real_metrics = WorkspaceEngine.get_live_kpi_metrics()
            
            _live_data_state["kpis"] = real_metrics
            _live_data_state["last_updated"] = datetime.utcnow().isoformat()

            # Broadcast to all connected websocket clients
            dead_sockets = []
            for ws in _active_websockets:
                try:
                    await ws.send_json(_live_data_state)
                except Exception:
                    dead_sockets.append(ws)

            for dead in dead_sockets:
                if dead in _active_websockets:
                    _active_websockets.remove(dead)
                    
        except Exception as e:
            print(f"Live Update Error: {e}")
            
        await asyncio.sleep(10)  # Refresh every 10 seconds for real data


# --- HELPERS ---
def _prepare_runtime_dataframe(df: pd.DataFrame, max_rows: int = 20000) -> pd.DataFrame:
    if len(df) <= max_rows:
        return df
    sample_idx = np.linspace(0, len(df) - 1, num=max_rows, dtype=int)
    return df.iloc[sample_idx].copy()


def _build_dashboard_response(
    dataset_id: str,
    df: pd.DataFrame,
    pipeline: dict,
    filename=None,
    is_live=False,
    available_sheets=None,
    total_rows=None,
):
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
        "rows": total_rows or len(df),
        "analytics": pipeline.get("analytics", {}),
        "ml_predictions": pipeline.get("ml_predictions", {}),
        "insights": pipeline.get("insights", []),
        "summary": summary,
        "raw_data": raw_preview,
        "columns": list(df.columns),
    }
    return response
