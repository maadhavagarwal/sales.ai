"""
Financial & Tax Compliance Routes
Endpoints for expenses, GST management, and tax reporting
"""

import io
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, Body
from fastapi.responses import JSONResponse

from app.core.database_manager import get_user_record, log_activity
from app.middleware.security import verify_token, get_user_from_token
from app.services.expense_service import ExpenseService
from app.services.gst_service import GSTService

router = APIRouter(prefix="/api/v1", tags=["Financial & Tax Compliance"])


# ============ EXPENSE MANAGEMENT ENDPOINTS ============

@router.post("/expenses/upload")
async def upload_expenses(
    file: UploadFile = File(...),
    token: str = Depends(verify_token),
):
    """Upload expense sheet (CSV/Excel) for integration"""
    try:
        # Get user info
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if not company_id:
            raise HTTPException(status_code=400, detail="Company not configured")
        
        # Read file
        file_content = await file.read()
        
        # Parse expenses
        expense_service = ExpenseService()
        success, message, expenses = expense_service.parse_expense_sheet(
            file_content, file.filename, company_id
        )
        
        if not success:
            log_activity(user_id, company_id, "UPLOAD_EXPENSES", "FAILED", details=message)
            raise HTTPException(status_code=400, detail=message)
        
        # Import expenses
        success, message, count = expense_service.import_expenses(expenses, company_id, user_id)
        
        if not success:
            log_activity(user_id, company_id, "UPLOAD_EXPENSES", "FAILED", details=message)
            raise HTTPException(status_code=500, detail=message)
        
        log_activity(user_id, company_id, "UPLOAD_EXPENSES", "SUCCESS", 
                     details=f"Imported {count} expenses")
        
        return {
            "success": True,
            "message": message,
            "count": count,
            "expenses": expenses[:10],  # Return first 10 for preview
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expenses")
async def get_expenses(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    only_itc_eligible: Optional[bool] = Query(False),
    token: str = Depends(verify_token),
):
    """Get expenses with optional filters"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        filters = {}
        if start_date:
            filters["start_date"] = start_date
        if end_date:
            filters["end_date"] = end_date
        if category:
            filters["category"] = category
        if only_itc_eligible:
            filters["only_itc_eligible"] = True
        
        expense_service = ExpenseService()
        expenses = expense_service.get_expenses(company_id, filters)
        
        return {
            "success": True,
            "count": len(expenses),
            "expenses": expenses,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expenses/summary")
async def get_expense_summary(
    month_year: Optional[str] = Query(None),
    token: str = Depends(verify_token),
):
    """Get expense summary for dashboard (GST metrics)"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        expense_service = ExpenseService()
        summary = expense_service.get_expense_summary(company_id, month_year)
        
        return {
            "success": True,
            "summary": summary,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expenses/reconcile")
async def reconcile_expenses(
    month_year: str = Body(..., embed=True),
    token: str = Depends(verify_token),
):
    """Mark expenses as reconciled for GST filing"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "FINANCE"]:
            raise HTTPException(status_code=403, detail="Only Finance/Admin can reconcile")
        
        expense_service = ExpenseService()
        success, message = expense_service.reconcile_expenses(company_id, month_year)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        log_activity(user_id, company_id, "RECONCILE_EXPENSES", "SUCCESS", details=month_year)
        
        return {"success": True, "message": message}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ GST COMPLIANCE ENDPOINTS ============

@router.post("/gst/record-transaction")
async def record_gst_transaction(
    data: dict = Body(...),
    token: str = Depends(verify_token),
):
    """Record a GST transaction (sales or purchases)"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        gst_service = GSTService()
        success, message = gst_service.record_gst_transaction(
            company_id=company_id,
            transaction_type=data.get("transaction_type"),
            invoice_number=data.get("invoice_number"),
            customer_gstin=data.get("customer_gstin"),
            customer_name=data.get("customer_name"),
            hsn_sac_code=data.get("hsn_sac_code"),
            description=data.get("description"),
            quantity=float(data.get("quantity", 0)),
            unit_price=float(data.get("unit_price", 0)),
            gst_rate=float(data.get("gst_rate", 0)),
            place_of_supply=data.get("place_of_supply", "SAME"),
            irn=data.get("irn"),
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        log_activity(user_id, company_id, "RECORD_GST_TRANSACTION", "SUCCESS")
        
        return {"success": True, "message": message}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gst/summary")
async def get_gst_summary(
    month_year: str = Query(...),
    token: str = Depends(verify_token),
):
    """Get GST summary for a specific month"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        gst_service = GSTService()
        summary = gst_service.get_gst_summary(company_id, month_year)
        
        return {
            "success": True,
            "summary": summary,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gst/gstr1")
async def get_gstr1_report(
    month_year: str = Query(...),
    token: str = Depends(verify_token),
):
    """Generate GSTR-1 (Outward Supply) report"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "FINANCE"]:
            raise HTTPException(status_code=403, detail="Only Finance/Admin can view reports")
        
        gst_service = GSTService()
        success, message, report = gst_service.create_gstr1_report(company_id, month_year)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        log_activity(user_id, company_id, "GENERATE_GSTR1", "SUCCESS")
        
        return {
            "success": True,
            "report": report,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gst/gstr2")
async def get_gstr2_report(
    month_year: str = Query(...),
    token: str = Depends(verify_token),
):
    """Generate GSTR-2 (Inward Supply) report"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "FINANCE"]:
            raise HTTPException(status_code=403, detail="Only Finance/Admin can view reports")
        
        gst_service = GSTService()
        success, message, report = gst_service.create_gstr2_report(company_id, month_year)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        log_activity(user_id, company_id, "GENERATE_GSTR2", "SUCCESS")
        
        return {
            "success": True,
            "report": report,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gst/gstr3b")
async def get_gstr3b_report(
    month_year: str = Query(...),
    token: str = Depends(verify_token),
):
    """Generate GSTR-3B (Monthly Tax Return) report"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "FINANCE"]:
            raise HTTPException(status_code=403, detail="Only Finance/Admin can view reports")
        
        gst_service = GSTService()
        success, message, report = gst_service.create_gstr3b_report(company_id, month_year)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        # Store the return
        gst_service.store_gst_return(company_id, month_year, "GSTR-3B", report)
        
        log_activity(user_id, company_id, "GENERATE_GSTR3B", "SUCCESS")
        
        return {
            "success": True,
            "report": report,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gst/reconciliation")
async def get_gst_reconciliation(
    month_year: str = Query(...),
    token: str = Depends(verify_token),
):
    """Get GST reconciliation details for a month"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "FINANCE"]:
            raise HTTPException(status_code=403, detail="Only Finance/Admin can view reconciliation")
        
        gst_service = GSTService()
        
        # Get summary for reconciliation checking
        summary = gst_service.get_gst_summary(company_id, month_year)
        
        return {
            "success": True,
            "reconciliation": {
                "month_year": month_year,
                "status": "Reconciled" if summary else "Pending",
                "details": summary,
            },
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gst/file-return")
async def file_gst_return(
    return_data: dict = Body(...),
    token: str = Depends(verify_token),
):
    """File/submit a GST return"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role != "ADMIN":
            raise HTTPException(status_code=403, detail="Only Admin can file returns")
        
        gst_service = GSTService()
        success, message = gst_service.store_gst_return(
            company_id,
            return_data.get("month_year"),
            return_data.get("return_type"),
            return_data.get("report", {}),
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        log_activity(user_id, company_id, "FILE_GST_RETURN", "SUCCESS", 
                     details=f"{return_data.get('return_type')} for {return_data.get('month_year')}")
        
        return {
            "success": True,
            "message": message,
            "return_id": f"{return_data.get('return_type')}-{return_data.get('month_year')}",
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
