from fastapi import APIRouter, Depends
from app.api.v1.deps import get_current_user
from app.engines.workspace_engine import WorkspaceEngine

router = APIRouter()

@router.get("/health-scores")
async def get_crm_health(current_user: dict = Depends(get_current_user)):
    """Customer health scoring based on payment patterns and interaction frequency."""
    return WorkspaceEngine.get_customer_health_scores()


@router.get("/predictive-insights")
async def get_crm_predictive(current_user: dict = Depends(get_current_user)):
    """AI-driven churn prediction and account health insights."""
    return {"insights": WorkspaceEngine.get_predictive_crm_insights()}
