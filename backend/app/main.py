import io
import math
import os
import time
import traceback
import uuid
import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Union, cast

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import sqlite3
import bcrypt
import jwt
import numpy as np
import pandas as pd
from fastapi import (
    BackgroundTasks,
    Body,
    Depends,
    FastAPI,
    File,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware, CORSConfig
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.tenant_enforcement import TenantEnforcementMiddleware

from app.core.database_manager import (
    DB_PATH,
    create_user_record,
    get_user_record,
    init_workspace_db,
    log_activity,
    store_data,
)
from app.core.cutover_gate import run_cutover_checks
from app.core.system_readiness import evaluate_full_system_readiness
from app.core.startup_guard import validate_startup_or_raise

app = FastAPI(
    title="NeuralBI Enterprise AI API",
    description="The backbone of the core Sales AI platform. Enterprise-grade only.",
    version="3.7.0",
)

RATE_LIMIT_RPM = int(os.getenv("RATE_LIMIT_RPM", "240"))

# Use the middleware settings
cors_params = CORSConfig.get_cors_middleware_params()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_params["allow_origins"],
    allow_credentials=cors_params["allow_credentials"],
    allow_methods=cors_params["allow_methods"],
    allow_headers=cors_params["allow_headers"],
    expose_headers=cors_params["expose_headers"],
    max_age=cors_params["max_age"],
)

@app.on_event("startup")
async def neural_startup_nexus():
    try:
        # Enforce strict validation
        validate_startup_or_raise()

        init_workspace_db()
        print("Corporate Database Initialized.")

    except Exception as e:
        print(f"Startup Error: {e}")
        # Log startup error too
        with open("error_log.txt", "a") as f:
            f.write(f"[{datetime.now()}] STARTUP ERROR: {str(e)}\n{traceback.format_exc()}\n")
        raise

@app.exception_handler(Exception)
async def enterprise_unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    err_trace = traceback.format_exc()
    
    # Log it to a local file for Antigravity debugging
    with open("error_log.txt", "a") as f:
        f.write(f"[{datetime.now()}] [ID:{request_id}] ERR: {str(exc)}\n{err_trace}\n")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_server_error",
                "message": f"Server error: {str(exc)}",
                "request_id": request_id,
            }
        },
    )

# --- MIDDLEWARE ORDER (OUTER-TO-INNER) ---
# 1. TenantEnforcement should be inner-most after identity is extracted
# 2. RequestID and identity extraction should be at the outer layers
app.add_middleware(TenantEnforcementMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=RATE_LIMIT_RPM)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)

# Collect Origins
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
CORSConfig.ALLOW_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]

# Include V1 Endpoints
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1") # Final prefix match for frontend

# Standalone expense/GST routes (/api/v1/expenses, /api/v1/expenses/summary, …) expected by the frontend
try:
    from app.routes.financial_compliance_routes import router as financial_compliance_router

    app.include_router(financial_compliance_router)
except Exception as financial_routes_err:
    print(f"Warning: financial_compliance_routes not mounted: {financial_routes_err}")

@app.get("/health")
async def root_health():
    """Public liveness probe (load balancers, smoke tests). Detailed metrics: GET /api/v1/system/health."""
    return {"status": "healthy"}


@app.get("/")
async def root():
    return {
        "message": "Welcome to NeuralBI Enterprise AI API",
        "version": "3.7.0",
        "docs": "/docs",
        "health": "/health",
        "system_health": "/api/v1/system/health",
    }
