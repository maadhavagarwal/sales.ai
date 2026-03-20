import json
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.database_manager import DB_PATH
from app.services.integration_service import IntegrationService


class MeetingsService:
    @staticmethod
    def _ensure_schema(conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                company_id TEXT,
                title TEXT,
                description TEXT,
                date TEXT,
                start_time TEXT,
                end_time TEXT,
                attendees TEXT,
                location TEXT,
                type TEXT,
                status TEXT,
                link TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # Backward-compatible migration for legacy deployments where `meetings`
        # was created with a minimal schema.
        columns = {
            row[1] for row in conn.execute("PRAGMA table_info(meetings)").fetchall()
        }
        missing_columns = [
            ("description", "TEXT DEFAULT ''"),
            ("date", "TEXT"),
            ("end_time", "TEXT"),
            ("location", "TEXT DEFAULT ''"),
            ("status", "TEXT DEFAULT 'upcoming'"),
            ("created_by", "TEXT"),
            ("attendees", "TEXT DEFAULT '[]'"),
        ]
        for col, col_type in missing_columns:
            if col not in columns:
                conn.execute(f"ALTER TABLE meetings ADD COLUMN {col} {col_type}")

        # Legacy table used `participants`; normalize data into `attendees`.
        if "participants" in columns:
            conn.execute(
                """
                UPDATE meetings
                SET attendees = COALESCE(NULLIF(attendees, ''), participants, '[]')
                """
            )

    @staticmethod
    def list_meetings(company_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MeetingsService._ensure_schema(conn)
            if status:
                rows = conn.execute(
                    """
                    SELECT * FROM meetings
                    WHERE company_id = ? AND status = ?
                    ORDER BY datetime(date || ' ' || start_time) ASC
                    """,
                    (company_id, status),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT * FROM meetings
                    WHERE company_id = ?
                    ORDER BY datetime(date || ' ' || start_time) ASC
                    """,
                    (company_id,),
                ).fetchall()
            return [MeetingsService._row_to_api(dict(r)) for r in rows]
        finally:
            conn.close()

    @staticmethod
    def get_meeting(company_id: str, meeting_id: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MeetingsService._ensure_schema(conn)
            row = conn.execute(
                "SELECT * FROM meetings WHERE id = ? AND company_id = ?",
                (meeting_id, company_id),
            ).fetchone()
            return MeetingsService._row_to_api(dict(row)) if row else None
        finally:
            conn.close()

    @staticmethod
    def create_meeting(company_id: str, created_by: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        meeting_id = f"meet_{uuid.uuid4().hex[:12]}"
        meeting_type = payload.get("type", "video")
        start_time = payload.get("time", "09:00")
        end_time = payload.get("end_time", "10:00")
        meeting_link = None
        if meeting_type == "video":
            meeting_link = IntegrationService.create_meeting_link(
                title=payload.get("title", "NeuralBI Meeting"),
                start_iso=f"{payload.get('date')}T{start_time}:00",
                attendees=payload.get("attendees", []),
            )

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MeetingsService._ensure_schema(conn)
            conn.execute(
                """
                INSERT INTO meetings (
                    id, company_id, title, description, date, start_time, end_time,
                    attendees, location, type, status, link, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    meeting_id,
                    company_id,
                    payload.get("title", "Untitled Meeting"),
                    payload.get("description", ""),
                    payload.get("date"),
                    start_time,
                    end_time,
                    json.dumps(payload.get("attendees", [])),
                    payload.get("location", "Virtual" if meeting_type == "video" else "Office"),
                    meeting_type,
                    payload.get("status", "upcoming"),
                    meeting_link,
                    created_by,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
            return MeetingsService._row_to_api(dict(row))
        finally:
            conn.close()

    @staticmethod
    def update_meeting(company_id: str, meeting_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = MeetingsService.get_meeting(company_id, meeting_id)
        if not existing:
            return None

        merged = {**existing, **payload}
        attendees = merged.get("attendees", [])
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            MeetingsService._ensure_schema(conn)
            conn.execute(
                """
                UPDATE meetings
                SET title = ?, description = ?, date = ?, start_time = ?, end_time = ?,
                    attendees = ?, location = ?, type = ?, status = ?, link = ?
                WHERE id = ? AND company_id = ?
                """,
                (
                    merged.get("title"),
                    merged.get("description", ""),
                    merged.get("date"),
                    merged.get("time") or merged.get("start_time"),
                    merged.get("end_time"),
                    json.dumps(attendees),
                    merged.get("location", ""),
                    merged.get("type", "video"),
                    merged.get("status", "upcoming"),
                    merged.get("meeting_link"),
                    meeting_id,
                    company_id,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
            return MeetingsService._row_to_api(dict(row)) if row else None
        finally:
            conn.close()

    @staticmethod
    def delete_meeting(company_id: str, meeting_id: str) -> bool:
        conn = sqlite3.connect(DB_PATH)
        try:
            MeetingsService._ensure_schema(conn)
            cur = conn.execute(
                "DELETE FROM meetings WHERE id = ? AND company_id = ?",
                (meeting_id, company_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()

    @staticmethod
    def _row_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
        attendees_raw = row.get("attendees") or "[]"
        try:
            attendees = json.loads(attendees_raw)
        except Exception:
            attendees = []

        return {
            "id": row.get("id"),
            "title": row.get("title", ""),
            "description": row.get("description", ""),
            "date": row.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
            "time": row.get("start_time", "09:00"),
            "start_time": row.get("start_time", "09:00"),
            "end_time": row.get("end_time", "10:00"),
            "attendees": attendees,
            "location": row.get("location", ""),
            "type": row.get("type", "video"),
            "status": row.get("status", "upcoming"),
            "meeting_link": row.get("link"),
        }
