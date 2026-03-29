from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any
from app.api.v1.deps import get_current_user_entity, get_db
from app.models.tenant import Organization, User, Workspace, membership_table
from pydantic import BaseModel
import uuid
import sqlite3
from app.core.database_manager import DB_PATH

router = APIRouter()

WORKSPACE_TEMPLATES = {
    "general": {
        "id": "general",
        "name": "General Business",
        "description": "Balanced template for most teams.",
        "workspaces": [("Main Operations", "Primary workspace for cross-functional operations")],
    },
    "retail": {
        "id": "retail",
        "name": "Retail & Commerce",
        "description": "Inventory-first workflow with sales and procurement lanes.",
        "workspaces": [
            ("Retail Command", "Daily sales, orders, and margin operations"),
            ("Inventory Control", "SKU movement and replenishment command center"),
        ],
    },
    "saas": {
        "id": "saas",
        "name": "SaaS Growth",
        "description": "Revenue, product analytics, and retention tracking.",
        "workspaces": [
            ("Revenue Intelligence", "MRR, churn, and expansion analytics"),
            ("Product Signals", "Usage patterns and customer success metrics"),
        ],
    },
    "manufacturing": {
        "id": "manufacturing",
        "name": "Manufacturing",
        "description": "Production + inventory + finance control loop.",
        "workspaces": [
            ("Plant Operations", "Throughput and fulfillment control board"),
            ("Supply Chain", "Vendor, procurement, and stock planning"),
        ],
    },
}


class OrganizationCreate(BaseModel):
    name: str
    industry: str | None = None
    size: str | None = None
    gstin: str | None = None
    workspace_template: str | None = "general"


def _get_launch_gates(company_id: str | None) -> dict:
    if not company_id:
        return {
            "gates": {
                "organization_created": False,
                "workspace_seeded": False,
                "security_policy_set": False,
                "data_uploaded": False,
            },
            "score": 0,
            "blockers": ["Organization not initialized"],
        }
    conn = sqlite3.connect(DB_PATH)
    try:
        profile = conn.execute(
            "SELECT name, details_json FROM company_profiles WHERE id = ?",
            (company_id,),
        ).fetchone()
        users = conn.execute("SELECT COUNT(*) FROM users WHERE company_id = ?", (company_id,)).fetchone()
        invoices = conn.execute("SELECT COUNT(*) FROM invoices WHERE company_id = ?", (company_id,)).fetchone()
        customers = conn.execute("SELECT COUNT(*) FROM customers WHERE company_id = ?", (company_id,)).fetchone()
        security_set = False
        if profile and profile[1]:
            import json
            try:
                details = json.loads(profile[1])
                security_set = bool(details.get("require_mfa") or details.get("ip_allowlist_enabled"))
            except Exception:
                security_set = False

        data_uploaded = int((invoices[0] if invoices else 0) or 0) + int((customers[0] if customers else 0) or 0) > 0
        workspace_seeded = int((users[0] if users else 0) or 0) > 0 and bool(profile and profile[0])
        gates = {
            "organization_created": True,
            "workspace_seeded": workspace_seeded,
            "security_policy_set": security_set,
            "data_uploaded": data_uploaded,
        }
        score = int(round((sum(1 for v in gates.values() if v) / len(gates)) * 100))
        blockers = [k for k, ok in gates.items() if not ok]
        return {"gates": gates, "score": score, "blockers": blockers}
    finally:
        conn.close()


@router.get("/status")
async def get_onboarding_status(
    current_user: User = Depends(get_current_user_entity)
) -> Any:
    """
    Check if the user has completed onboarding and has an organization.
    """
    return {
        "onboarding_complete": current_user.onboarding_complete,
        "has_organization": len(current_user.organizations) > 0
    }


@router.get("/templates")
async def list_onboarding_templates(current_user: User = Depends(get_current_user_entity)) -> Any:
    return {"items": list(WORKSPACE_TEMPLATES.values()), "count": len(WORKSPACE_TEMPLATES)}


@router.get("/launch-gates")
async def get_onboarding_launch_gates(
    current_user: User = Depends(get_current_user_entity),
) -> Any:
    active_org = current_user.organizations[0] if current_user.organizations else None
    company_id = active_org.uuid if active_org else None
    gate_data = _get_launch_gates(company_id)
    return {
        "company_id": company_id,
        "onboarding_complete": bool(current_user.onboarding_complete),
        **gate_data,
    }


@router.post("/initialize")
async def initialize_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_entity)
) -> Any:
    """
    Initialize a new Organization, create a default Workspace, 
    and set the current user as the OWNER.
    """
    # Create Organization
    db_org = Organization(
        name=org_in.name,
        slug=org_in.name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:4],
        industry=org_in.industry,
    )
    db.add(db_org)
    db.flush()

    template_id = str(org_in.workspace_template or "general").strip().lower()
    template = WORKSPACE_TEMPLATES.get(template_id, WORKSPACE_TEMPLATES["general"])
    created_workspace_ids: list[int] = []
    for workspace_name, workspace_desc in template["workspaces"]:
        db_workspace = Workspace(
            organization_id=db_org.id,
            name=workspace_name,
            description=workspace_desc,
        )
        db.add(db_workspace)
        db.flush()
        created_workspace_ids.append(db_workspace.id)

    current_user.organizations.append(db_org)
    current_user.onboarding_complete = True

    db.execute(
        membership_table.update()
        .where(
            membership_table.c.user_id == current_user.id,
            membership_table.c.organization_id == db_org.id,
        )
        .values(role="OWNER", is_active=True)
    )

    db.commit()
    db.refresh(db_org)

    return {
        "status": "SUCCESS",
        "organization_id": db_org.uuid,
        "workspace_ids": created_workspace_ids,
        "workspace_template": template["id"],
        "workspace_count": len(created_workspace_ids),
    }
