from fastapi import APIRouter
from app.api.v1.endpoints import auth, workspace, analytics, onboarding, crm, billing, system
from app.routes.missing_routes import router as missing_routes_router

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspace.router, prefix="/workspace", tags=["workspace"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(crm.router, prefix="/crm", tags=["crm"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(missing_routes_router, tags=["business-features"])
