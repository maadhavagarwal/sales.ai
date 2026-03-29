from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.database import SessionLocal
from app.core.database_manager import get_user_record
from app.models.tenant import Organization, membership_table, User
from sqlalchemy import select
import os

PROTECTED_PREFIXES = [
    "/api/v1/workspace",
    "/api/v1/analytics",
    "/api/v1/crm",
    "/api/v1/onboarding",
]

STRICT_TENANT_ENFORCEMENT = os.getenv("STRICT_TENANT_ENFORCEMENT", "false").lower() == "true"

class TenantEnforcementMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path
        if any(path.startswith(p) for p in PROTECTED_PREFIXES):
            # Check what's in state
            org_id = getattr(request.state, "org_id", "UNDEFINED_ORG")
            user_email = getattr(request.state, "user_email", "UNDEFINED_USER")
            
            # 1. Auth Enforcement
            if not user_email or user_email in ["UNDEFINED_USER", "anonymous"]:
                return JSONResponse(
                    status_code=401,
                    content={
                        "detail": "Authentication context missing in middleware",
                        "debug_state": {
                            "user_email": user_email,
                            "org_id": org_id,
                            "path": path,
                            "has_auth_header": bool(request.headers.get("Authorization"))
                        }
                    }
                )

            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == user_email).first()
                if not user:
                    # Legacy-authenticated users may exist only in workspace DB.
                    legacy_user = get_user_record(user_email)
                    if not legacy_user:
                        return JSONResponse(status_code=401, content={"detail": "User not found in SQLAlchemy store"})

                    # In permissive mode, allow legacy users through with DEFAULT org context.
                    if STRICT_TENANT_ENFORCEMENT:
                        return JSONResponse(
                            status_code=403,
                            content={"detail": "Legacy user requires tenant onboarding before accessing protected modules"},
                        )
                    request.state.org_id = "DEFAULT"
                    return await call_next(request)

                # 2. Org Identification
                if not org_id or org_id in ["UNDEFINED_ORG", "DEFAULT"]:
                    if user and user.organizations:
                        if len(user.organizations) == 1:
                            org_id = user.organizations[0].uuid
                            request.state.org_id = org_id
                        else:
                            if STRICT_TENANT_ENFORCEMENT:
                                return JSONResponse(status_code=400, content={"detail": "X-Org-Id header required for multi-organization users"})
                            # In permissive mode, keep DEFAULT context to avoid blocking app bootstrap.
                            request.state.org_id = "DEFAULT"
                            return await call_next(request)
                    else:
                        if STRICT_TENANT_ENFORCEMENT:
                            return JSONResponse(status_code=403, content={"detail": "User is not associated with any organization"})
                        request.state.org_id = "DEFAULT"
                        return await call_next(request)

                # 3. Membership Enforcement
                org = db.query(Organization).filter(Organization.uuid == org_id).first()
                if not org:
                    if STRICT_TENANT_ENFORCEMENT:
                        return JSONResponse(status_code=403, content={"detail": f"Organization {org_id} not found"})
                    request.state.org_id = "DEFAULT"
                    return await call_next(request)

                stmt = select(membership_table.c.role).where(
                    membership_table.c.user_id == user.id,
                    membership_table.c.organization_id == org.id,
                    membership_table.c.is_active.is_(True),
                )
                res = db.execute(stmt).scalar_one_or_none()
                if not res:
                    if STRICT_TENANT_ENFORCEMENT:
                        return JSONResponse(status_code=403, content={"detail": "User does not belong to the requested organization"})
                    request.state.org_id = "DEFAULT"
                    return await call_next(request)

            finally:
                db.close()

        return await call_next(request)
