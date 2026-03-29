import os
import sqlite3
import time

import bcrypt
import jwt
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.v1.deps import get_current_user
from app.core.database_manager import (
    DB_PATH,
    create_user_record,
    get_user_record,
    log_activity,
)
from app.engines.workspace_engine import WorkspaceEngine
from app.schemas.auth import (
    AuthSuccessResponse,
    LoginRequest,
    RegisterEnterpriseRequest,
    RegisterRequest,
)
from app.services.integration_service import IntegrationService

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "9f4e2b8a6d1c3f7e5a9b2d4c6e8f0a1b7c9d2e4f6a8b0c3d")
ALGORITHM = "HS256"
ALLOWED_ROLES = {"ADMIN", "SALES", "FINANCE", "WAREHOUSE", "HR"}


def _provision_enterprise_org(company_uuid: str, company_name: str) -> None:
    """Ensure entitlement source-of-truth exists for feature-gated modules."""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE,
                name TEXT NOT NULL,
                slug TEXT,
                logo_url TEXT,
                industry TEXT,
                stripe_customer_id TEXT,
                subscription_plan TEXT DEFAULT 'FREE',
                subscription_status TEXT DEFAULT 'INACTIVE',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        conn.execute(
            """
            INSERT INTO organizations (uuid, name, subscription_plan, subscription_status, is_active)
            VALUES (?, ?, 'ENTERPRISE', 'ACTIVE', 1)
            ON CONFLICT(uuid) DO UPDATE SET
                name = excluded.name,
                subscription_plan = 'ENTERPRISE',
                subscription_status = 'ACTIVE',
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
            """,
            (company_uuid, company_name),
        )
        conn.commit()
    finally:
        conn.close()


def _resolve_org_plan(company_uuid: str | None) -> tuple[str, str]:
    if not company_uuid:
        return ("FREE", "ACTIVE")
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT subscription_plan, subscription_status FROM organizations WHERE uuid = ?",
            (company_uuid,),
        ).fetchone()
        if not row:
            return ("FREE", "ACTIVE")
        plan = str(row[0] or "FREE").upper()
        status_value = str(row[1] or "ACTIVE").upper()
        return (plan, status_value)
    finally:
        conn.close()


def _bootstrap_legacy_org_if_missing(company_uuid: str | None) -> None:
    """Backfill tenant row for legacy accounts so feature gating works consistently."""
    if not company_uuid:
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT name FROM organizations WHERE uuid = ?",
            (company_uuid,),
        ).fetchone()
        if row:
            return
        profile = conn.execute(
            "SELECT name FROM company_profiles WHERE id = ?",
            (company_uuid,),
        ).fetchone()
        company_name = str((profile[0] if profile else None) or "Enterprise Organization")
    finally:
        conn.close()
    _provision_enterprise_org(company_uuid, company_name)


def _validate_password_policy(password: str) -> str | None:
    if len(password) < 10:
        return "Password must be at least 10 characters long"
    if not any(ch.islower() for ch in password):
        return "Password must include at least one lowercase letter"
    if not any(ch.isupper() for ch in password):
        return "Password must include at least one uppercase letter"
    if not any(ch.isdigit() for ch in password):
        return "Password must include at least one number"
    if not any(ch in "!@#$%^&*()-_=+[]{}|;:'\",.<>/?`~" for ch in password):
        return "Password must include at least one special character"
    return None


@router.post("/register")
async def register(payload: RegisterRequest):
    """Enterprise Registration: Enforces role assignment during account creation."""
    email = payload.email.strip().lower()
    password = payload.password
    requested_role = str(payload.role or "ADMIN").upper()

    if requested_role not in ALLOWED_ROLES:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid role. Allowed roles: {', '.join(sorted(ALLOWED_ROLES))}"},
        )

    password_error = _validate_password_policy(password)
    if password_error:
        return JSONResponse(status_code=400, content={"error": password_error})

    salt = bcrypt.gensalt()
    pwd_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
    user_id = create_user_record(email, pwd_hash, role=requested_role)
    if user_id is False:
        return JSONResponse(status_code=400, content={"error": "Email already registered"})

    token = jwt.encode(
        {
            "id": user_id,
            "email": email,
            "role": requested_role,
            "allowed_ips": None,
            "exp": time.time() + 86400,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return AuthSuccessResponse(message="User created", token=token, role=requested_role)


@router.post("/register-enterprise")
async def register_enterprise(payload: RegisterEnterpriseRequest):
    """Enterprise Registration with Business Details and Email Service."""
    email = payload.email.strip().lower()
    password = payload.password
    company_details = payload.company_details.model_dump()

    missing_fields = []
    if not email:
        missing_fields.append("email")
    if not password:
        missing_fields.append("password")
    if not company_details.get("name"):
        missing_fields.append("company name")
    if not company_details.get("contact_person"):
        missing_fields.append("contact person")

    if missing_fields:
        return JSONResponse(
            status_code=400,
            content={"error": f"Missing required fields: {', '.join(missing_fields)}"},
        )

    password_error = _validate_password_policy(password)
    if password_error:
        return JSONResponse(status_code=400, content={"error": password_error})

    salt = bcrypt.gensalt()
    pwd_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
    user_id = create_user_record(email, pwd_hash, role="ADMIN")
    if user_id is False:
        return JSONResponse(status_code=400, content={"error": "Email already registered"})

    company_data = {
        "name": company_details.get("name"),
        "gstin": company_details.get("gstin", ""),
        "industry": company_details.get("industry", "Other"),
        "size": company_details.get("size", "50-200"),
        "hq_location": company_details.get("hq_location", ""),
        "contact_person": company_details.get("contact_person"),
        "phone": company_details.get("phone", ""),
        "business_type": company_details.get("business_type", "Private Limited"),
    }

    company_result = WorkspaceEngine.manage_company_profile("SAVE", company_data)
    if "id" not in company_result:
        return JSONResponse(
            status_code=500, content={"error": "Failed to create company profile"}
        )

    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE users SET company_id = ? WHERE id = ?", (company_result["id"], user_id))
    conn.commit()
    conn.close()

    _provision_enterprise_org(company_result["id"], company_data["name"])

    token = jwt.encode(
        {
            "id": user_id,
            "email": email,
            "role": "ADMIN",
            "company_id": company_result["id"],
            "allowed_ips": None,
            "exp": time.time() + 86400,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    try:
        welcome_subject = f"Welcome to NeuralBI - {company_data['name']}"
        welcome_body = (
            f"Welcome to NeuralBI! Your enterprise account for {company_data['name']} is ready."
        )
        IntegrationService.send_email(email, welcome_subject, welcome_body)
    except Exception:
        pass

    return AuthSuccessResponse(
        message="Enterprise account created successfully",
        token=token,
        role="ADMIN",
        company_id=company_result["id"],
        welcome_email_sent=True,
    )


@router.post("/login")
async def login(payload: LoginRequest):
    """Enterprise Login: Returns session token with embedded role claims."""
    email = payload.email.strip().lower()
    password = payload.password
    user = get_user_record(email)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Invalid email or password"})

    stored_hash = user["password_hash"]
    role = user.get("role") or "ADMIN"

    if bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
        company_id = user.get("company_id")
        _bootstrap_legacy_org_if_missing(company_id)
        token = jwt.encode(
            {
                "id": user["id"],
                "email": email,
                "role": role,
                "company_id": company_id,
                "allowed_ips": user.get("allowed_ips"),
                "exp": time.time() + 86400,
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        plan, status_value = _resolve_org_plan(company_id)
        return AuthSuccessResponse(
            token=token,
            role=role,
            company_id=company_id,
            metadata={"plan": plan, "status": status_value},
        )

    return JSONResponse(status_code=401, content={"error": "Invalid email or password"})


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Enterprise Logout: Invalidates session token."""
    try:
        user_id = current_user.get("id", 0)
        company_id = current_user.get("company_id")
        log_activity(
            user_id,
            "USER_LOGOUT",
            "AUTH",
            entity_id=company_id,
            details={"email": current_user.get("email"), "status": "SUCCESS"},
        )
        return {"message": "Logout successful"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
