"""
Advanced messaging models with database persistence
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, ForeignKey, Table, ARRAY
from sqlalchemy.orm import declarative_base, relationship
from pydantic import BaseModel

Base = declarative_base()

# --- SQLAlchemy Models (Database Layer) ---

class Conversation(Base):
    """Persistent conversation storage"""
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String, default="Untitled Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_archived = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    participants = Column(ARRAY(String), nullable=True)  # For group chats
    
    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_pinned": self.is_pinned,
            "message_count": len(self.messages),
            "last_message": self.messages[-1].content if self.messages else None
        }


class Message(Base):
    """Persistent message storage"""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), index=True)
    sender_id = Column(String, ForeignKey("users.id"), index=True)
    sender_name = Column(String)
    sender_email = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    attachment_urls = Column(ARRAY(String), nullable=True)
    edit_history = Column(ARRAY(Text), nullable=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender": self.sender_name,
            "sender_email": self.sender_email,
            "content": self.content,
            "timestamp": self.created_at.isoformat(),
            "read": self.is_read,
            "attachments": self.attachment_urls
        }


class Meeting(Base):
    """Persistent meeting storage"""
    __tablename__ = "meetings"
    
    id = Column(String, primary_key=True)
    created_by = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, index=True)
    end_time = Column(DateTime)
    location = Column(String, nullable=True)
    meeting_type = Column(String, default="video")  # video, phone, in-person, hybrid
    status = Column(String, default="upcoming")  # upcoming, in-progress, completed, cancelled
    attendees = Column(ARRAY(String))
    meeting_link = Column(String, nullable=True)
    recording_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "location": self.location,
            "type": self.meeting_type,
            "status": self.status,
            "attendees": self.attendees,
            "meeting_link": self.meeting_link,
            "recording_url": self.recording_url
        }


# --- Pydantic Models (API Request/Response) ---

class MessageCreate(BaseModel):
    """Create message request"""
    conversation_id: str
    content: str
    attachments: Optional[List[str]] = None


class MessageResponse(BaseModel):
    """Message response"""
    id: str
    sender: str
    sender_email: str
    content: str
    timestamp: str
    read: bool
    attachments: Optional[List[str]] = None
    
    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    """Create conversation request"""
    title: Optional[str] = None
    participants: Optional[List[str]] = None


class ConversationResponse(BaseModel):
    """Conversation response"""
    id: str
    title: str
    created_at: str
    updated_at: str
    is_pinned: bool
    message_count: int
    last_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class MeetingCreate(BaseModel):
    """Create meeting request"""
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    location: Optional[str] = None
    meeting_type: str = "video"
    attendees: List[str]


class MeetingResponse(BaseModel):
    """Meeting response"""
    id: str
    title: str
    description: Optional[str]
    start_time: str
    end_time: str
    location: Optional[str]
    status: str
    type: str
    attendees: List[str]
    meeting_link: Optional[str]
    recording_url: Optional[str]
    
    class Config:
        from_attributes = True
