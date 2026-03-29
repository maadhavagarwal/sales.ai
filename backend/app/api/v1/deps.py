from typing import Any, Callable

from fastapi import Depends, Header, HTTPException, status
import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session
import os

from app.core.database import get_db
from app.core.database_manager import get_user_record
from app.models.tenant import Organization, User, membership_table

SECRET_KEY = os.getenv("SECRET_KEY", "9f4e2b8a6d1c3f7e5a9b2d4c6e8f0a1b7c9d2e4f6a8b0c3d")
ALGORITHM = "HS256"

PLAN_FEATURES: dict[str, list[str]] = {
    "FREE": [
        "core_dashboard",
        "workspace_basic",
        "crm_basic",
    ],
    "PRO": [
        "core_dashboard",
        "workspace_basic",
        "crm_basic",
        "advanced_analytics",
        "ops_sync_center",
    ],
    "ENTERPRISE": [
        "core_dashboard",
        "workspace_basic",
        "crm_basic",
        "advanced_analytics",
        "ops_sync_center",
        "enterprise_control",
        "migration_verification",
        "backup_restore_drill",
    ],
}


def _decode_bearer_token(authorization: str | None) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed authentication header",
        )

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: Decode failed",
        )

    user_email = payload.get("email")
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: Missing email claim",
        )

    return payload


def get_current_user(
    db: Session = Depends(get_db), authorization: str = Header(None)
) -> dict[str, Any]:
    """Unified principal used by legacy and v1 endpoints."""
    payload = _decode_bearer_token(authorization)
    user_email = str(payload["email"])

    user = db.query(User).filter(User.email == user_email).first()
    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        primary_org = user.organizations[0] if user.organizations else None
        company_id = payload.get("company_id") or (primary_org.uuid if primary_org else "DEFAULT")

        return {
            "id": user.id,
            "user_id": user.id,
            "email": user.email,
            "role": str(payload.get("role") or "ADMIN"),
            "company_id": company_id,
            "organization_ids": [org.uuid for org in user.organizations],
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
        }

    legacy_user = get_user_record(user_email)
    if legacy_user:
        return {
            "id": legacy_user.get("id"),
            "user_id": legacy_user.get("id"),
            "email": legacy_user.get("email"),
            "role": str(payload.get("role") or legacy_user.get("role") or "ADMIN"),
            "company_id": legacy_user.get("company_id") or payload.get("company_id") or "DEFAULT",
            "organization_ids": [],
            "is_active": True,
            "is_superuser": False,
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Account not found",
    )


def get_current_user_entity(
    db: Session = Depends(get_db), authorization: str = Header(None)
) -> User:
    """SQLAlchemy user entity dependency for tenant onboarding flows."""
    payload = _decode_bearer_token(authorization)
    user_email = str(payload["email"])

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found in tenant store",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def get_current_org(
    x_org_id: str = Header(None),
    current_user: User = Depends(get_current_user_entity),
    db: Session = Depends(get_db),
) -> Organization:
    """Enforces organizational scope for multi-tenant APIs."""
    if not x_org_id:
        if len(current_user.organizations) == 1:
            return current_user.organizations[0]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Org-Id header is required for multi-organization users.",
        )

    org = db.query(Organization).filter(Organization.uuid == x_org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    if org not in current_user.organizations:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization.",
        )

    return org


def require_org_roles(*allowed_roles: str) -> Callable[..., Organization]:
    """Factory dependency to enforce organization-level membership roles."""
    normalized = {role.upper() for role in allowed_roles}

    def _role_dependency(
        org: Organization = Depends(get_current_org),
        current_user: User = Depends(get_current_user_entity),
        db: Session = Depends(get_db),
    ) -> Organization:
        stmt = select(membership_table.c.role).where(
            membership_table.c.user_id == current_user.id,
            membership_table.c.organization_id == org.id,
            membership_table.c.is_active.is_(True),
        )
        member_role = db.execute(stmt).scalar_one_or_none()
        if not member_role or str(member_role).upper() not in normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Organization role required: {', '.join(sorted(normalized))}",
            )
        return org

    return _role_dependency


def require_user_roles(*allowed_roles: str) -> Callable[..., dict[str, Any]]:
    """Factory dependency to enforce app-level roles from the unified principal."""
    normalized = {role.upper() for role in allowed_roles}

    def _role_dependency(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        user_role = str(current_user.get("role") or "").upper()
        if user_role not in normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role required: {', '.join(sorted(normalized))}",
            )
        return current_user

    return _role_dependency


def get_current_entitlements(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Resolve plan and feature entitlements from tenant subscription state."""
    default_plan = "FREE"
    default_status = "ACTIVE"

    org_uuid = current_user.get("company_id")
    plan = default_plan
    status_value = default_status

    user = db.query(User).filter(User.email == current_user.get("email")).first()
    if user and user.organizations:
        selected_org = None

        if org_uuid and org_uuid != "DEFAULT":
            selected_org = next((org for org in user.organizations if org.uuid == org_uuid), None)

        if selected_org is None:
            selected_org = user.organizations[0]

        plan = str(selected_org.subscription_plan or default_plan).upper()
        status_value = str(selected_org.subscription_status or default_status).upper()
        org_uuid = selected_org.uuid

    plan_features = PLAN_FEATURES.get(plan, PLAN_FEATURES["FREE"])

    return {
        "plan": plan,
        "status": status_value,
        "features": plan_features,
        "company_id": org_uuid or "DEFAULT",
    }


def require_features(*required_features: str) -> Callable[..., dict[str, Any]]:
    """Factory dependency to enforce subscription feature entitlements."""
    normalized = {feature.strip() for feature in required_features if feature.strip()}

    def _feature_dependency(
        entitlements: dict[str, Any] = Depends(get_current_entitlements),
    ) -> dict[str, Any]:
        enabled = set(entitlements.get("features", []))
        missing = sorted(feature for feature in normalized if feature not in enabled)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Subscription feature required: {', '.join(missing)}",
            )
        return entitlements

    return _feature_dependency
