"""
Messaging API Routes
Handles inbox, conversations, and message operations with real-time updates
"""
import os
from collections import defaultdict
from datetime import datetime
from typing import List, Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.main import get_current_user
from app.services.messaging_service import MessagingService

router = APIRouter(
    prefix="/api/messaging",
    tags=["messaging"],
    dependencies=[],
)

_message_subscribers = defaultdict(list)

# Models
class Message(BaseModel):
    id: str
    sender: str
    sender_email: str
    content: str
    timestamp: str
    read: bool
    attachments: Optional[List[str]] = None

class Conversation(BaseModel):
    id: str
    participants: List[str]
    last_message: str
    last_timestamp: str
    unread_count: int
    pinned: bool

class MessageInput(BaseModel):
    conversation_id: str
    content: str
    attachments: Optional[List[str]] = None

@router.get("/conversations", response_model=List[Conversation])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Fetch all conversations for current user"""
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        return MessagingService.list_conversations(company_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_conversation_messages(
    conversation_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Fetch messages for a specific conversation"""
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        return MessagingService.list_messages(company_id, conversation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    message_input: MessageInput,
    current_user: dict = Depends(get_current_user),
):
    """Send a message to a conversation"""
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        sender_email = current_user.get("email", "unknown@company.com")
        new_message = MessagingService.send_message(
            company_id=company_id,
            conversation_id=conversation_id,
            sender=sender_email,
            sender_email=sender_email,
            content=message_input.content,
            attachments=message_input.attachments,
        )

        event = {
            "event": "message:new",
            "conversation_id": conversation_id,
            "message": new_message,
        }
        dead = []
        for ws in _message_subscribers[company_id]:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in _message_subscribers[company_id]:
                _message_subscribers[company_id].remove(ws)

        return {
            "success": True,
            "message": new_message,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conversation_id}/pin")
async def pin_conversation(
    conversation_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Pin/unpin a conversation"""
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        pinned = MessagingService.set_pinned(company_id, conversation_id, True)
        if not pinned:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"success": True, "pinned": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Archive/delete a conversation"""
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        archived = MessagingService.archive_conversation(company_id, conversation_id)
        if not archived:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"success": True, "archived": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations")
async def create_conversation(
    participants: List[str],
    current_user: dict = Depends(get_current_user),
):
    """Create a new conversation"""
    try:
        if not participants:
            raise HTTPException(status_code=400, detail="At least one participant required")

        company_id = current_user.get("company_id", "DEFAULT")
        creator = current_user.get("email", "unknown@company.com")
        return MessagingService.create_conversation(company_id, creator, participants)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get total unread message count"""
    try:
        company_id = current_user.get("company_id", "DEFAULT")
        return {"unread_count": MessagingService.get_unread_count(company_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def messaging_ws(websocket: WebSocket):
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=4401, reason="Missing auth token")
        return

    secret = os.getenv("SECRET_KEY", "INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        company_id = payload.get("company_id") or "DEFAULT"
    except Exception:
        await websocket.close(code=4401, reason="Invalid auth token")
        return

    await websocket.accept()
    _message_subscribers[company_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in _message_subscribers[company_id]:
            _message_subscribers[company_id].remove(websocket)
