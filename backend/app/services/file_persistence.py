"""
File Persistence Service - Maintains uploaded files across user sessions
Stores file metadata in database, keeps actual files on disk
"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
import sqlite3
import pandas as pd


class FileStorage:
    """Manages persistent file storage linked to user accounts"""

    def __init__(self, storage_dir: str = "data/uploads", db_path: str = "data/file_metadata.db"):
        self.storage_dir = Path(storage_dir)
        self.db_path = db_path
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._init_database()

    def _init_database(self):
        """Initialize SQLite database for file metadata"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS uploaded_files (
                    dataset_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    content_hash TEXT,
                    file_type TEXT,
                    columns_count INTEGER,
                    rows_count INTEGER,
                    is_archived INTEGER DEFAULT 0,
                    metadata JSON
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS file_access_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dataset_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    action TEXT,
                    details JSON,
                    FOREIGN KEY(dataset_id) REFERENCES uploaded_files(dataset_id)
                )
            """)
            conn.commit()

    def save_file(
        self,
        user_id: str,
        file_content: bytes,
        filename: str,
        file_type: str = "csv",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Save uploaded file permanently linked to user
        
        Returns:
            {
                "dataset_id": "CHAT-ABC123",
                "file_path": "/path/to/file",
                "upload_timestamp": "2026-03-19T10:30:00"
            }
        """
        dataset_id = f"CHAT-{uuid.uuid4().hex[:6].upper()}"
        user_dir = self.storage_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = user_dir / f"{dataset_id}_{filename}"
        
        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        file_size = len(file_content)
        upload_time = datetime.now().isoformat()
        
        # Calculate simple hash
        content_hash = str(hash(file_content))[:16]
        
        # Extract metadata if provided
        rows_count = metadata.get("rows", None) if metadata else None
        columns_count = metadata.get("columns", None) if metadata else None
        
        # Save metadata to database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO uploaded_files 
                (dataset_id, user_id, filename, file_path, file_size, 
                 content_hash, file_type, columns_count, rows_count, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dataset_id, user_id, filename, str(file_path),
                file_size, content_hash, file_type, columns_count, rows_count,
                json.dumps(metadata or {})
            ))
            conn.commit()
        
        # Log access
        self._log_access(dataset_id, user_id, "upload", {"filename": filename})
        
        return {
            "dataset_id": dataset_id,
            "file_path": str(file_path),
            "upload_timestamp": upload_time,
            "file_size": file_size,
            "status": "stored"
        }

    def load_file(self, user_id: str, dataset_id: str) -> Optional[bytes]:
        """Load file from disk for user"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT file_path FROM uploaded_files 
                WHERE dataset_id = ? AND user_id = ? AND is_archived = 0
            """, (dataset_id, user_id))
            
            result = cursor.fetchone()
            if not result:
                return None
            
            file_path = result[0]
            
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            
            # Log access
            self._log_access(dataset_id, user_id, "load")
            return content
        except FileNotFoundError:
            return None

    def get_user_files(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all uploaded files for a user"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT dataset_id, filename, file_size, upload_timestamp, 
                       file_type, columns_count, rows_count, metadata
                FROM uploaded_files 
                WHERE user_id = ? AND is_archived = 0
                ORDER BY upload_timestamp DESC
            """, (user_id,))
            
            files = []
            for row in cursor.fetchall():
                files.append({
                    "dataset_id": row[0],
                    "filename": row[1],
                    "file_size": row[2],
                    "upload_timestamp": row[3],
                    "file_type": row[4],
                    "columns_count": row[5],
                    "rows_count": row[6],
                    "metadata": json.loads(row[7]) if row[7] else {}
                })
        
        return files

    def get_file_metadata(self, user_id: str, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a specific file"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT dataset_id, filename, file_size, upload_timestamp, 
                       file_type, columns_count, rows_count, metadata
                FROM uploaded_files 
                WHERE dataset_id = ? AND user_id = ?
            """, (dataset_id, user_id))
            
            result = cursor.fetchone()
            if not result:
                return None
            
            return {
                "dataset_id": result[0],
                "filename": result[1],
                "file_size": result[2],
                "upload_timestamp": result[3],
                "file_type": result[4],
                "columns_count": result[5],
                "rows_count": result[6],
                "metadata": json.loads(result[7]) if result[7] else {}
            }

    def archive_file(self, user_id: str, dataset_id: str) -> bool:
        """Soft delete - archive file instead of permanently deleting"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE uploaded_files 
                SET is_archived = 1
                WHERE dataset_id = ? AND user_id = ?
            """, (dataset_id, user_id))
            conn.commit()
        
        self._log_access(dataset_id, user_id, "archive")
        return True

    def delete_file(self, user_id: str, dataset_id: str) -> bool:
        """Permanently delete file from disk and database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT file_path FROM uploaded_files 
                WHERE dataset_id = ? AND user_id = ?
            """, (dataset_id, user_id))
            
            result = cursor.fetchone()
            if not result:
                return False
            
            file_path = result[0]
            
            # Delete from database
            conn.execute("""
                DELETE FROM uploaded_files 
                WHERE dataset_id = ? AND user_id = ?
            """, (dataset_id, user_id))
            conn.commit()
        
        # Delete from disk
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file: {e}")
        
        self._log_access(dataset_id, user_id, "delete")
        return True

    def _log_access(self, dataset_id: str, user_id: str, action: str, details: Optional[Dict] = None):
        """Log file access for audit trail"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO file_access_logs (dataset_id, user_id, action, details)
                VALUES (?, ?, ?, ?)
            """, (dataset_id, user_id, action, json.dumps(details or {})))
            conn.commit()

    def get_access_logs(self, dataset_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Get access history for a file"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT access_timestamp, action, details
                FROM file_access_logs 
                WHERE dataset_id = ? AND user_id = ?
                ORDER BY access_timestamp DESC
                LIMIT 50
            """, (dataset_id, user_id))
            
            logs = []
            for row in cursor.fetchall():
                logs.append({
                    "timestamp": row[0],
                    "action": row[1],
                    "details": json.loads(row[2]) if row[2] else {}
                })
        
        return logs

    def cleanup_old_files(self, days: int = 90) -> int:
        """Archive files not accessed in X days"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(f"""
                UPDATE uploaded_files 
                SET is_archived = 1
                WHERE is_archived = 0 
                AND datetime(upload_timestamp) < datetime('now', '-{days} days')
            """)
            conn.commit()
            return cursor.rowcount


# Global instance
_file_storage: Optional[FileStorage] = None


def get_file_storage() -> FileStorage:
    """Get or create file storage instance"""
    global _file_storage
    
    if _file_storage is None:
        # Get paths from environment or use defaults
        storage_dir = os.getenv("FILE_STORAGE_DIR", "data/uploads")
        db_path = os.getenv("FILE_METADATA_DB", "data/file_metadata.db")
        _file_storage = FileStorage(storage_dir, db_path)
    
    return _file_storage
