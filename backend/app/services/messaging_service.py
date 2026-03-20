import json
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.database_manager import DB_PATH


class MessagingService:
    @staticmethod
    def _ensure_schema(conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messaging_conversations (
                id TEXT PRIMARY KEY,
                company_id TEXT,
                created_by TEXT,
                pinned INTEGER DEFAULT 0,
                archived INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messaging_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT,
                participant TEXT,
                participant_email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messaging_messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT,
                company_id TEXT,
                sender TEXT,
                sender_email TEXT,
                content TEXT,
                attachments_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

    @staticmethod
    def create_conversation(company_id: str, created_by: str, participants: List[str]) -> Dict[str, Any]:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        clean_participants = [p.strip() for p in participants if p and p.strip()]

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MessagingService._ensure_schema(conn)
            conn.execute(
                "INSERT INTO messaging_conversations (id, company_id, created_by) VALUES (?, ?, ?)",
                (conversation_id, company_id, created_by),
            )
            for p in clean_participants:
                conn.execute(
                    "INSERT INTO messaging_participants (conversation_id, participant, participant_email) VALUES (?, ?, ?)",
                    (conversation_id, p, p if "@" in p else None),
                )
            conn.commit()
            return MessagingService.get_conversation(company_id, conversation_id) or {}
        finally:
            conn.close()

    @staticmethod
    def list_conversations(company_id: str) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MessagingService._ensure_schema(conn)
            rows = conn.execute(
                """
                SELECT c.*,
                       (SELECT content FROM messaging_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                       (SELECT created_at FROM messaging_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_timestamp,
                       (SELECT COUNT(*) FROM messaging_messages m WHERE m.conversation_id = c.id) AS message_count
                FROM messaging_conversations c
                WHERE c.company_id = ? AND c.archived = 0
                ORDER BY COALESCE(last_timestamp, c.created_at) DESC
                """,
                (company_id,),
            ).fetchall()

            conversations = []
            for row in rows:
                conv_id = row["id"]
                participant_rows = conn.execute(
                    "SELECT participant FROM messaging_participants WHERE conversation_id = ? ORDER BY id ASC",
                    (conv_id,),
                ).fetchall()
                conversations.append(
                    {
                        "id": conv_id,
                        "participants": [p["participant"] for p in participant_rows],
                        "last_message": row["last_message"] or "",
                        "last_timestamp": row["last_timestamp"] or row["created_at"],
                        "unread_count": 0,
                        "pinned": bool(row["pinned"]),
                    }
                )
            return conversations
        finally:
            conn.close()

    @staticmethod
    def get_conversation(company_id: str, conversation_id: str) -> Optional[Dict[str, Any]]:
        conversations = MessagingService.list_conversations(company_id)
        for conv in conversations:
            if conv["id"] == conversation_id:
                return conv
        return None

    @staticmethod
    def list_messages(company_id: str, conversation_id: str) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MessagingService._ensure_schema(conn)
            rows = conn.execute(
                """
                SELECT * FROM messaging_messages
                WHERE company_id = ? AND conversation_id = ?
                ORDER BY created_at ASC
                """,
                (company_id, conversation_id),
            ).fetchall()

            messages = []
            for row in rows:
                attachments_raw = row["attachments_json"] or "[]"
                try:
                    attachments = json.loads(attachments_raw)
                except Exception:
                    attachments = []
                messages.append(
                    {
                        "id": row["id"],
                        "sender": row["sender"],
                        "sender_email": row["sender_email"],
                        "content": row["content"],
                        "timestamp": row["created_at"],
                        "read": True,
                        "attachments": attachments,
                    }
                )
            return messages
        finally:
            conn.close()

    @staticmethod
    def send_message(
        company_id: str,
        conversation_id: str,
        sender: str,
        sender_email: str,
        content: str,
        attachments: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        attachments = attachments or []

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MessagingService._ensure_schema(conn)
            exists = conn.execute(
                "SELECT 1 FROM messaging_conversations WHERE id = ? AND company_id = ?",
                (conversation_id, company_id),
            ).fetchone()
            if not exists:
                raise ValueError("Conversation not found")

            conn.execute(
                """
                INSERT INTO messaging_messages (
                    id, conversation_id, company_id, sender, sender_email, content, attachments_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    msg_id,
                    conversation_id,
                    company_id,
                    sender,
                    sender_email,
                    content,
                    json.dumps(attachments),
                ),
            )
            conn.commit()

            return {
                "id": msg_id,
                "sender": sender,
                "sender_email": sender_email,
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "read": True,
                "attachments": attachments,
            }
        finally:
            conn.close()

    @staticmethod
    def set_pinned(company_id: str, conversation_id: str, pinned: bool) -> bool:
        conn = sqlite3.connect(DB_PATH)
        try:
            MessagingService._ensure_schema(conn)
            cur = conn.execute(
                "UPDATE messaging_conversations SET pinned = ? WHERE id = ? AND company_id = ?",
                (1 if pinned else 0, conversation_id, company_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()

    @staticmethod
    def archive_conversation(company_id: str, conversation_id: str) -> bool:
        conn = sqlite3.connect(DB_PATH)
        try:
            MessagingService._ensure_schema(conn)
            cur = conn.execute(
                "UPDATE messaging_conversations SET archived = 1 WHERE id = ? AND company_id = ?",
                (conversation_id, company_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()

    @staticmethod
    def get_unread_count(company_id: str) -> int:
        # Placeholder for read-tracking extension; persistent store exists for future per-user read states.
        conn = sqlite3.connect(DB_PATH)
        try:
            MessagingService._ensure_schema(conn)
            row = conn.execute(
                "SELECT COUNT(*) FROM messaging_messages WHERE company_id = ?",
                (company_id,),
            ).fetchone()
            return int(row[0]) if row else 0
        finally:
            conn.close()
