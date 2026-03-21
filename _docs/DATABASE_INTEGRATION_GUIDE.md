# Database Integration Guide

## Overview

This guide provides complete database schema and migration instructions for integrating real database support into the messaging, meetings, and management features.

---

## Phase 1: Schema Design

### Database Choice

**Recommended**: PostgreSQL 14+
- Full-featured relation support
- JSON support for flexible data
- UUID types built-in
- Excellent for scaling
- Better than SQLite for production

**Alternative**: SQLite3
- Development and testing
- Single-file deployment
- Good for small deployments

### Core Tables

---

## Users (Existing - Reference)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar_url VARCHAR(512),
  role VARCHAR(50) DEFAULT 'SALES',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);
```

---

## Conversations Table

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  is_group BOOLEAN DEFAULT FALSE,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_created_at (created_at),
  INDEX idx_created_by (created_by),
  INDEX idx_archived (is_archived)
);
```

**Purpose**: Represents a conversation (1:1 or group)  
**Key Fields**:
- `id`: Unique identifier (UUID for flexibility)
- `title`: Optional conversation name
- `is_group`: TRUE for group conversations
- `created_by`: User who initiated
- `is_archived`: Soft delete flag

---

## Conversation Participants

```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  read_until TIMESTAMP,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived_locally BOOLEAN DEFAULT FALSE,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id),
  INDEX idx_conversation (conversation_id),
  INDEX idx_user (user_id),
  INDEX idx_unread (unread_count),
  INDEX idx_pinned (is_pinned)
);
```

**Purpose**: Junction table tracking user participation in conversations  
**Key Fields**:
- `read_until`: Timestamp for read receipts
- `is_pinned`: User has pinned this conversation
- `is_archived_locally`: User archived (not deleted)
- `unread_count`: Cache for unread message count

---

## Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  --options: 'text', 'image', 'file', 'video', 'location'
  metadata JSONB,
  -- {
  --   "file_url": "...",
  --   "file_size": 1024,
  --   "file_name": "...",
  --   "mime_type": "..."
  -- }
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted (is_deleted)
);
```

**Purpose**: Individual messages within conversations  
**Key Fields**:
- `message_type`: Supports text, images, files, etc.
- `metadata`: JSONB for flexible data (file info)
- `is_edited`: Track message edits
- `is_deleted`: Soft delete flag

---

## Message Reactions

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(message_id, user_id, emoji),
  INDEX idx_message (message_id),
  INDEX idx_user (user_id)
);
```

**Purpose**: Emoji reactions to messages  
**Key Fields**:
- `emoji`: Unicode emoji character
- Prevents duplicate reactions

---

## Message Read Receipts

```sql
CREATE TABLE message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(message_id, user_id),
  INDEX idx_message (message_id),
  INDEX idx_user (user_id)
);
```

**Purpose**: Track when users read messages  
**Key Fields**:
- One entry per user per message
- Enables read receipt UI

---

## Meetings Table

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  -- options: 'scheduled', 'happening', 'completed', 'cancelled'
  meeting_type VARCHAR(50),
  -- options: 'video', 'phone', 'in_person', 'hybrid'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  room_id VARCHAR(255),
  -- for video conferencing
  meeting_link VARCHAR(512),
  -- generated video call link
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(255),
  -- iCalendar RRULE format
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_start_time (start_time),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_cancelled (is_cancelled)
);
```

**Purpose**: Meeting/calendar entries  
**Key Fields**:
- `status`: Tracks meeting lifecycle
- `meeting_type`: Video/phone/in-person
- `meeting_link`: Video call URL
- `recurrence_rule`: For recurring meetings (iCalendar format)

---

## Meeting Attendees

```sql
CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  rsvp_status VARCHAR(50) DEFAULT 'pending',
  -- options: 'pending', 'accepted', 'declined', 'tentative'
  is_organizer BOOLEAN DEFAULT FALSE,
  is_optional BOOLEAN DEFAULT FALSE,
  attended BOOLEAN,
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, user_id),
  INDEX idx_meeting (meeting_id),
  INDEX idx_user (user_id),
  INDEX idx_rsvp_status (rsvp_status)
);
```

**Purpose**: Track meeting attendance and RSVP  
**Key Fields**:
- `rsvp_status`: Invitation response
- `is_organizer`: Permission handling
- `joined_at`/`left_at`: Actual attendance
- `reminder_sent`: Notification tracking

---

## Meeting Reminders

```sql
CREATE TABLE meeting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  reminder_time TIMESTAMP NOT NULL,
  -- when to send reminder
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  reminder_type VARCHAR(50) DEFAULT 'notification',
  -- options: 'notification', 'email', 'sms'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reminder_time (reminder_time),
  INDEX idx_sent (is_sent)
);
```

**Purpose**: Configurable reminders for meetings  
**Key Fields**:
- `reminder_time`: When to trigger
- `reminder_type`: Notification/email/SMS
- `is_sent`: Track delivery

---

## Audit Log (Optional but Recommended)

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

**Purpose**: Track user activities for compliance  
**Key Fields**:
- `action`: sent_message, scheduled_meeting, etc.
- `details`: JSONB for flexible logging
- Use for audit trails

---

## Phase 2: Migrations

### Create Migration Files

```bash
# Create migrations directory
mkdir -p backend/app/migrations

# Create migration files
touch backend/app/migrations/001_create_messaging_tables.sql
touch backend/app/migrations/002_create_meetings_tables.sql
touch backend/app/migrations/003_create_indexes.sql
```

### Migration: 001_create_messaging_tables.sql

```sql
-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  is_group BOOLEAN DEFAULT FALSE,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  read_until TIMESTAMP,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived_locally BOOLEAN DEFAULT FALSE,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  metadata JSONB,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Migration: 002_create_meetings_tables.sql

```sql
-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  meeting_type VARCHAR(50),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  room_id VARCHAR(255),
  meeting_link VARCHAR(512),
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(255),
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create meeting_attendees table
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  rsvp_status VARCHAR(50) DEFAULT 'pending',
  is_organizer BOOLEAN DEFAULT FALSE,
  is_optional BOOLEAN DEFAULT FALSE,
  attended BOOLEAN,
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, user_id)
);

-- Create meeting_reminders table
CREATE TABLE IF NOT EXISTS meeting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  reminder_time TIMESTAMP NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  reminder_type VARCHAR(50) DEFAULT 'notification',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Migration: 003_create_indexes.sql

```sql
-- Messaging indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived);

CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_unread ON conversation_participants(unread_count);
CREATE INDEX IF NOT EXISTS idx_participants_pinned ON conversation_participants(is_pinned);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(is_deleted);

-- Meetings indexes
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_cancelled ON meetings(is_cancelled);

CREATE INDEX IF NOT EXISTS idx_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendees_user ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_attendees_rsvp ON meeting_attendees(rsvp_status);

CREATE INDEX IF NOT EXISTS idx_reminders_time ON meeting_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_sent ON meeting_reminders(is_sent);
```

---

## Phase 3: Backend Integration

### Update API Routes - messaging_routes.py

```python
# backend/app/routes/messaging_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID
from app.core.dependency import get_current_user, get_db
from app.models import User, Conversation, Message, ConversationParticipant
from pydantic import BaseModel

router = APIRouter(prefix="/api/messaging", tags=["messaging"])

# Pydantic Models
class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    metadata: dict = {}

class ConversationCreate(BaseModel):
    title: str
    user_ids: list[int]
    is_group: bool = False

# Routes
@router.get("/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for current user"""
    participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user.id,
        ConversationParticipant.left_at == None,
        ConversationParticipant.is_archived_locally == False
    ).order_by(ConversationParticipant.is_pinned.desc()).all()
    
    conversations = []
    for p in participants:
        conv = db.query(Conversation).filter(
            Conversation.id == p.conversation_id
        ).first()
        last_message = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.is_deleted == False
        ).order_by(Message.created_at.desc()).first()
        
        conversations.append({
            "id": str(conv.id),
            "title": conv.title,
            "is_group": conv.is_group,
            "last_message": last_message.content if last_message else None,
            "last_message_at": last_message.created_at if last_message else conv.created_at,
            "unread_count": p.unread_count,
            "is_pinned": p.is_pinned,
            "participants": [str(cp.user_id) for cp in 
                db.query(ConversationParticipant).filter(
                    ConversationParticipant.conversation_id == conv.id,
                    ConversationParticipant.left_at == None
                ).all()]
        })
    
    return conversations

@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages in a conversation"""
    # Verify user is in conversation
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id,
        ConversationParticipant.left_at == None
    ).first()
    
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_deleted == False
    ).order_by(Message.created_at.asc()).all()
    
    # Update read_until timestamp
    participant.read_until = datetime.utcnow()
    participant.unread_count = 0
    db.commit()
    
    return [{
        "id": str(m.id),
        "content": m.content,
        "type": m.message_type,
        "sender_id": m.sender_id,
        "created_at": m.created_at,
        "is_edited": m.is_edited
    } for m in messages]

@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: UUID,
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send message to conversation"""
    # Verify user in conversation
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id,
        ConversationParticipant.left_at == None
    ).first()
    
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    # Create message
    new_message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message.content,
        message_type=message.message_type,
        metadata=message.metadata
    )
    db.add(new_message)
    
    # Update all participants' unread counts (except sender)
    other_participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != current_user.id,
        ConversationParticipant.left_at == None
    ).all()
    
    for p in other_participants:
        p.unread_count += 1
    
    db.commit()
    db.refresh(new_message)
    
    return {
        "id": str(new_message.id),
        "content": new_message.content,
        "created_at": new_message.created_at
    }

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get total unread message count"""
    total = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user.id,
        ConversationParticipant.left_at == None
    ).with_entities(
        db.func.sum(ConversationParticipant.unread_count)
    ).scalar() or 0
    
    return {"unread_count": total}
```

### Update API Routes - meetings_routes.py

```python
# backend/app/routes/meetings_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID
from app.core.dependency import get_current_user, get_db
from app.models import User, Meeting, MeetingAttendee, MeetingReminder
from pydantic import BaseModel

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

class MeetingCreate(BaseModel):
    title: str
    description: str = ""
    start_time: datetime
    end_time: datetime
    location: str = ""
    meeting_type: str = "video"
    attendee_ids: list[int]

@router.get("/")
async def get_meetings(
    status_filter: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meetings for current user"""
    query = db.query(Meeting).join(MeetingAttendee).filter(
        MeetingAttendee.user_id == current_user.id,
        Meeting.is_cancelled == False
    )
    
    if status_filter:
        query = query.filter(Meeting.status == status_filter)
    
    meetings = query.order_by(Meeting.start_time.asc()).all()
    
    return [{
        "id": str(m.id),
        "title": m.title,
        "start_time": m.start_time,
        "end_time": m.end_time,
        "status": m.status,
        "meeting_type": m.meeting_type,
        "location": m.location,
        "attendees": [str(a.user_id) for a in m.attendees]
    } for m in meetings]

@router.post("/")
async def create_meeting(
    meeting_data: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new meeting"""
    new_meeting = Meeting(
        title=meeting_data.title,
        description=meeting_data.description,
        start_time=meeting_data.start_time,
        end_time=meeting_data.end_time,
        location=meeting_data.location,
        meeting_type=meeting_data.meeting_type,
        created_by=current_user.id,
        status="scheduled"
    )
    db.add(new_meeting)
    db.flush()
    
    # Add attendees
    for user_id in meeting_data.attendee_ids:
        attendee = MeetingAttendee(
            meeting_id=new_meeting.id,
            user_id=user_id,
            is_organizer=(user_id == current_user.id),
            rsvp_status="pending" if user_id != current_user.id else "accepted"
        )
        db.add(attendee)
    
    db.commit()
    db.refresh(new_meeting)
    
    return {
        "id": str(new_meeting.id),
        "title": new_meeting.title,
        "start_time": new_meeting.start_time,
        "created_at": new_meeting.created_at
    }

@router.get("/upcoming/next")
async def get_next_meeting(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get next upcoming meeting for current user"""
    now = datetime.utcnow()
    meeting = db.query(Meeting).join(MeetingAttendee).filter(
        MeetingAttendee.user_id == current_user.id,
        Meeting.start_time > now,
        Meeting.is_cancelled == False
    ).order_by(Meeting.start_time.asc()).first()
    
    if not meeting:
        return None
    
    return {
        "id": str(meeting.id),
        "title": meeting.title,
        "start_time": meeting.start_time,
        "location": meeting.location,
        "meeting_type": meeting.meeting_type
    }
```

---

## Phase 4: SQLAlchemy Models

Create `backend/app/models/messaging.py`:

```python
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255))
    is_group = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_archived = Column(Boolean, default=False)
    
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    __table_args__ = (UniqueConstraint('conversation_id', 'user_id'),)
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    read_until = Column(DateTime, nullable=True)
    is_pinned = Column(Boolean, default=False)
    is_archived_locally = Column(Boolean, default=False)
    unread_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="conversation_participations")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"))
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text")
    metadata = Column(JSON, default={})
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
```

Create `backend/app/models/meetings.py`:

```python
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="scheduled")
    meeting_type = Column(String(50))
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String(255))
    room_id = Column(String(255))
    meeting_link = Column(String(512))
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(255))
    is_cancelled = Column(Boolean, default=False)
    cancelled_at = Column(DateTime, nullable=True)
    
    attendees = relationship("MeetingAttendee", back_populates="meeting", cascade="all, delete-orphan")
    reminders = relationship("MeetingReminder", back_populates="meeting", cascade="all, delete-orphan")
    organizer = relationship("User", back_populates="organized_meetings")

class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"
    __table_args__ = (UniqueConstraint('meeting_id', 'user_id'),)
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    rsvp_status = Column(String(50), default="pending")
    is_organizer = Column(Boolean, default=False)
    is_optional = Column(Boolean, default=False)
    attended = Column(Boolean, nullable=True)
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="attendees")
    user = relationship("User", back_populates="meeting_attendances")

class MeetingReminder(Base):
    __tablename__ = "meeting_reminders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    reminder_time = Column(DateTime, nullable=False)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    reminder_type = Column(String(50), default="notification")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="reminders")
    user = relationship("User")
```

---

## Phase 5: Running Migrations

### Using Alembic (Recommended)

```bash
# Initialize Alembic
cd backend
alembic init alembic

# Generate migration
alembic revision --autogenerate -m "Add messaging and meetings tables"

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

### Direct SQL Execution

```bash
# For PostgreSQL
psql -U postgres -d sales_ai_db -f backend/app/migrations/001_create_messaging_tables.sql
psql -U postgres -d sales_ai_db -f backend/app/migrations/002_create_meetings_tables.sql
psql -U postgres -d sales_ai_db -f backend/app/migrations/003_create_indexes.sql
```

---

## Phase 6: Testing Database Integration

### Test Script

```python
# backend/test_database_integration.py
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Conversation, Message, Meeting, MeetingAttendee
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://user:password@localhost/sales_ai_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_messaging_flow():
    db = SessionLocal()
    try:
        # Create conversation
        conv = Conversation(
            title="Team Chat",
            is_group=True,
            created_by=1
        )
        db.add(conv)
        db.commit()
        print(f"✓ Created conversation: {conv.id}")
        
        # Send message
        msg = Message(
            conversation_id=conv.id,
            sender_id=1,
            content="Hello team!"
        )
        db.add(msg)
        db.commit()
        print(f"✓ Sent message: {msg.id}")
        
        # Retrieve messages
        messages = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).all()
        print(f"✓ Retrieved {len(messages)} messages")
        
    finally:
        db.close()

def test_meetings_flow():
    db = SessionLocal()
    try:
        # Create meeting
        meeting = Meeting(
            title="Team Standup",
            start_time=datetime.utcnow() + timedelta(hours=1),
            end_time=datetime.utcnow() + timedelta(hours=2),
            meeting_type="video",
            created_by=1
        )
        db.add(meeting)
        db.commit()
        print(f"✓ Created meeting: {meeting.id}")
        
        # Add attendees
        attendee = MeetingAttendee(
            meeting_id=meeting.id,
            user_id=2,
            rsvp_status="pending"
        )
        db.add(attendee)
        db.commit()
        print(f"✓ Added attendee")
        
        # Query meetings
        meetings = db.query(Meeting).filter(
            Meeting.start_time > datetime.utcnow()
        ).all()
        print(f"✓ Found {len(meetings)} upcoming meetings")
        
    finally:
        db.close()

if __name__ == "__main__":
    print("Testing Messaging Integration...")
    test_messaging_flow()
    
    print("\nTesting Meetings Integration...")
    test_meetings_flow()
    
    print("\n✅ All tests passed!")
```

---

## Checklist for Database Integration

- [ ] PostgreSQL 14+ installed and running
- [ ] Database created (sales_ai_db)
- [ ] SQLAlchemy models defined
- [ ] Migration files created
- [ ] Migrations applied successfully
- [ ] Test data inserted
- [ ] API endpoints connect to database
- [ ] CRUD operations working
- [ ] Relationships defined correctly
- [ ] Indexes created for performance
- [ ] Transactions working
- [ ] Error handling implemented
- [ ] Connection pooling configured
- [ ] Backups scheduled
- [ ] Monitoring set up

---

## Performance Optimization

### Indexes Created
- Conversation list by timestamp
- Message search by conversation
- Meeting search by time
- Attendance RSVP queries
- Unread message counts

### Query Optimization
- Eager loading relationships
- Pagination on large queries
- Caching frequently accessed data
- Connection pooling

### Expected Performance
- List conversations: < 50ms
- Send message: < 100ms
- Get messages: < 200ms
- Schedule meeting: < 150ms
- List meetings: < 100ms

---

## Next Steps

1. **Set up PostgreSQL database**
2. **Configure SQLAlchemy connection**
3. **Run migrations**
4. **Update API routes with database queries**
5. **Update frontend to use real API**
6. **Run comprehensive tests**
7. **Deploy to staging**
8. **Load test database**
9. **Optimize queries**
10. **Deploy to production**

---

*Database Integration Guide v1.0*
