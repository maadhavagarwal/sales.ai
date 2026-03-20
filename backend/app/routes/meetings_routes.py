"""Meetings API routes backed by persistent storage and provider-generated links."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

# get_current_user will be resolved dynamically to prevent 401 auth loss on circular router imports
from fastapi import Request
async def get_current_user_lazy(request: Request):
    from fastapi import HTTPException
    import jwt, os
    auth = request.headers.get("Authorization")
    if not auth:
        raise HTTPException(status_code=401, detail="Authentication required")
    token = auth.replace("Bearer ", "")
    SECRET_KEY = os.getenv("SECRET_KEY", "INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

from app.services.meetings_service import MeetingsService

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


class Meeting(BaseModel):
    id: str
    title: str
    description: str
    date: str
    time: str
    start_time: str
    end_time: str
    attendees: List[str]
    location: str
    type: str
    status: str
    meeting_link: Optional[str] = None


class MeetingInput(BaseModel):
    title: str
    description: str
    date: str
    time: str
    attendees: List[str]
    location: str
    type: str


@router.get("/", response_model=List[Meeting])
async def get_meetings(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user_lazy),
):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        return MeetingsService.list_meetings(company_id, status=status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Meeting)
async def create_meeting(
    meeting_input: MeetingInput,
    current_user: dict = Depends(get_current_user_lazy),
):
    try:
        if not meeting_input.title or not meeting_input.date or not meeting_input.time:
            raise HTTPException(status_code=400, detail="Title, date, and time are required")
        company_id = current_user.get("company_id", "DEFAULT")
        created_by = current_user.get("email", "system@neuralbi.local")
        return MeetingsService.create_meeting(
            company_id=company_id,
            created_by=created_by,
            payload=meeting_input.dict(),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{meeting_id}", response_model=Meeting)
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user_lazy),
):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        meeting = MeetingsService.get_meeting(company_id, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{meeting_id}", response_model=Meeting)
async def update_meeting(
    meeting_id: str,
    meeting_input: MeetingInput,
    current_user: dict = Depends(get_current_user_lazy),
):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        updated = MeetingsService.update_meeting(company_id, meeting_id, meeting_input.dict())
        if not updated:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user_lazy),
):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        deleted = MeetingsService.delete_meeting(company_id, meeting_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return {"success": True, "message": "Meeting cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{meeting_id}/join")
async def join_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user_lazy),
):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        meeting = MeetingsService.get_meeting(company_id, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if not meeting.get("meeting_link"):
            raise HTTPException(status_code=400, detail="No meeting link available")
        return {
            "success": True,
            "meeting_id": meeting_id,
            "join_url": meeting.get("meeting_link"),
            "token": "secure_token_123",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar/{date}")
async def get_calendar_day(date: str, current_user: dict = Depends(get_current_user_lazy)):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        meetings = [m for m in MeetingsService.list_meetings(company_id) if m.get("date") == date]
        return {"date": date, "meetings": meetings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{meeting_id}/reminder")
async def set_reminder(
    meeting_id: str,
    reminder_time: int,
    current_user: dict = Depends(get_current_user_lazy),
):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        meeting = MeetingsService.get_meeting(company_id, meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return {"success": True, "meeting_id": meeting_id, "reminder_time": reminder_time}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming/next")
async def get_next_meeting(current_user: dict = Depends(get_current_user_lazy)):
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        meetings = MeetingsService.list_meetings(company_id, status="upcoming")
        return meetings[0] if meetings else {"id": "", "title": "", "time": "", "attendees": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
