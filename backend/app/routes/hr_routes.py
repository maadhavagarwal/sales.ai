"""
HR Management Routes
Endpoints for employee management, credential sharing, and HR operations
"""

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.core.database_manager import get_user_record, log_activity
from app.middleware.security import verify_token, get_user_from_token
from app.services.hr_service import HRService

router = APIRouter(prefix="/api/v1/hr", tags=["HR Management"])


# ============ EMPLOYEE MANAGEMENT ENDPOINTS ============


@router.post("/employees/create")
async def create_employee(
    payload: dict = Body(...),
    token: str = Depends(verify_token),
):
    """Create a new employee user account with auto-generated password"""
    try:
        # Verify user is HR or ADMIN
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "HR"]:
            raise HTTPException(
                status_code=403, detail="Only HR and Admin can create employees"
            )

        # Extract payload
        employee_email = payload.get("email", "").strip()
        employee_name = payload.get("name", "").strip()
        employee_role = payload.get("role", "SALES")
        department = payload.get("department", "Sales")
        should_send_email = payload.get("send_email", True)

        if not employee_email or not employee_name:
            raise HTTPException(
                status_code=400, detail="Email and name are required"
            )

        # Create employee
        hr_service = HRService()
        success, message, user_data = hr_service.create_employee_user(
            email=employee_email,
            employee_name=employee_name,
            role=employee_role,
            company_id=company_id or "DEFAULT",
            department=department,
        )

        if not success:
            raise HTTPException(status_code=400, detail=message)

        # Send credentials email if requested
        if should_send_email and user_data:
            email_success, email_message = hr_service.send_credential_email(
                email=employee_email,
                employee_name=employee_name,
                password=user_data["temp_password"],
                custom_message=payload.get("message", ""),
            )

            if email_success:
                log_activity(
                    user_id,
                    company_id,
                    "EMPLOYEE_CREATED_EMAIL_SENT",
                    "SUCCESS",
                    details={"employee_email": employee_email},
                )
            else:
                # Still return success but note the email failed
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "user": user_data,
                        "message": message,
                        "email_status": "FAILED",
                        "email_error": email_message,
                    },
                )

        log_activity(
            user_id,
            company_id,
            "EMPLOYEE_CREATED",
            "SUCCESS",
            details={"employee_email": employee_email, "role": employee_role},
        )

        return {
            "success": True,
            "user": user_data,
            "message": message,
            "email_status": "SENT" if should_send_email else "SKIPPED",
        }

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"Error creating employee: {str(e)}"}
        )


@router.get("/employees/list")
async def list_employees(token: str = Depends(verify_token)):
    """Get list of all employees in company"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "HR"]:
            raise HTTPException(
                status_code=403, detail="Only HR and Admin can view employees"
            )

        hr_service = HRService()
        employees = hr_service.get_employees(company_id or "DEFAULT")

        log_activity(
            user_id,
            company_id,
            "EMPLOYEES_LISTED",
            "SUCCESS",
            details={"count": len(employees)},
        )

        return {"success": True, "employees": employees, "total": len(employees)}

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error fetching employees: {str(e)}"},
        )


@router.post("/employees/update-role")
async def update_employee_role(
    payload: dict = Body(...),
    token: str = Depends(verify_token),
):
    """Update an employee's role"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "HR"]:
            raise HTTPException(
                status_code=403, detail="Only HR and Admin can update roles"
            )

        employee_id = payload.get("employee_id")
        new_role = payload.get("role")

        if not employee_id or not new_role:
            raise HTTPException(
                status_code=400, detail="Employee ID and role are required"
            )

        hr_service = HRService()
        success, message = hr_service.update_employee_role(
            employee_id, new_role, company_id or "DEFAULT"
        )

        if not success:
            raise HTTPException(status_code=400, detail=message)

        log_activity(
            user_id,
            company_id,
            "EMPLOYEE_ROLE_UPDATED",
            "SUCCESS",
            details={"employee_id": employee_id, "new_role": new_role},
        )

        return {"success": True, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"Error updating role: {str(e)}"}
        )


@router.post("/employees/delete/{employee_id}")
async def delete_employee(
    employee_id: int,
    token: str = Depends(verify_token),
):
    """Remove an employee"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "HR"]:
            raise HTTPException(
                status_code=403, detail="Only HR and Admin can delete employees"
            )

        hr_service = HRService()
        success, message = hr_service.delete_employee(
            employee_id, company_id or "DEFAULT"
        )

        if not success:
            raise HTTPException(status_code=400, detail=message)

        log_activity(
            user_id,
            company_id,
            "EMPLOYEE_DELETED",
            "SUCCESS",
            details={"employee_id": employee_id},
        )

        return {"success": True, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500, content={"error": f"Error deleting employee: {str(e)}"}
        )


# ============ EMAIL COMMUNICATION ENDPOINTS ============


@router.post("/emails/send-credential")
async def send_credential_email(
    payload: dict = Body(...),
    token: str = Depends(verify_token),
):
    """Send credential email to employee"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "HR"]:
            raise HTTPException(
                status_code=403, detail="Only HR and Admin can send credentials"
            )

        employee_email = payload.get("email", "").strip()
        employee_name = payload.get("name", "").strip()
        password = payload.get("password", "").strip()
        custom_message = payload.get("message", "")

        if not employee_email or not password or not employee_name:
            raise HTTPException(
                status_code=400,
                detail="Email, name, and password are required",
            )

        hr_service = HRService()
        success, message = hr_service.send_credential_email(
            email=employee_email,
            employee_name=employee_name,
            password=password,
            custom_message=custom_message,
        )

        if not success:
            raise HTTPException(status_code=400, detail=message)

        log_activity(
            user_id,
            company_id,
            "CREDENTIAL_EMAIL_SENT",
            "SUCCESS",
            details={"recipient": employee_email},
        )

        return {"success": True, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error sending email: {str(e)}"},
        )


@router.post("/emails/send-hr-notification")
async def send_hr_notification(
    payload: dict = Body(...),
    token: str = Depends(verify_token),
):
    """Send HR notification email"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user_id, email, role, company_id = get_user_from_token(user_data)
        
        if role not in ["ADMIN", "HR"]:
            raise HTTPException(
                status_code=403, detail="Only HR and Admin can send HR emails"
            )

        hr_email = payload.get("hr_email", email).strip()  # Default to sent by user
        subject = payload.get("subject", "").strip()
        message = payload.get("message", "").strip()
        recipient_email = payload.get("recipient_email")
        action_type = payload.get("action_type", "notification")

        if not subject or not message:
            raise HTTPException(
                status_code=400, detail="Subject and message are required"
            )

        hr_service = HRService()
        success, result_message = hr_service.send_hr_notification_email(
            hr_email=hr_email,
            subject=subject,
            message=message,
            recipient_email=recipient_email,
            action_type=action_type,
        )

        if not success:
            raise HTTPException(status_code=400, detail=result_message)

        log_activity(
            user_id,
            company_id,
            "HR_EMAIL_SENT",
            "SUCCESS",
            details={
                "type": action_type,
                "subject": subject,
                "recipient": recipient_email or hr_email,
            },
        )

        return {"success": True, "message": result_message}

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error sending HR email: {str(e)}"},
        )


@router.get("/emails/templates")
async def get_email_templates(token: str = Depends(verify_token)):
    """Get HR email templates"""
    try:
        user_data = get_user_record(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")

        templates = {
            "welcome": {
                "subject": "Welcome to the Team",
                "message": "Welcome to our company! We're excited to have you join our team. Please find your login credentials below...",
            },
            "birthday": {
                "subject": "Happy Birthday!",
                "message": "Wishing you a wonderful birthday and a great year ahead!",
            },
            "anniversary": {
                "subject": "Work Anniversary",
                "message": "Celebrating your work anniversary with our company. Thank you for your dedication and contributions!",
            },
            "promotion": {
                "subject": "Congratulations on Your Promotion",
                "message": "We're thrilled to inform you of your promotion. Your hard work and dedication have not gone unnoticed.",
            },
            "performance_review": {
                "subject": "Your Performance Review",
                "message": "Your annual performance review has been scheduled. Please log in to the system to view your evaluations.",
            },
        }

        return {"success": True, "templates": templates}

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error fetching templates: {str(e)}"},
        )
