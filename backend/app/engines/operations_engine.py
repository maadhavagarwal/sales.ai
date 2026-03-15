import sqlite3
import uuid
import json
import traceback
from datetime import datetime
from app.core.database_manager import DB_PATH, log_activity

class OperationsEngine:
    @staticmethod
    def get_operations_data():
        """Fetches all operational data: personnel, tasks, and schedules."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            # 1. Personnel
            personnel = [dict(row) for row in conn.execute("SELECT * FROM personnel").fetchall()]
            
            # 2. Tasks
            tasks = [dict(row) for row in conn.execute("SELECT * FROM tasks").fetchall()]
            
            # 3. Schedules
            schedules = [dict(row) for row in conn.execute("SELECT * FROM operational_schedules").fetchall()]
            
            return {
                "personnel": personnel,
                "tasks": tasks,
                "schedules": schedules
            }
        except Exception as e:
            print(f"Error fetching operations data: {e}")
            return {"error": str(e)}
        finally:
            conn.close()

    @staticmethod
    def manage_personnel(action: str, data: dict):
        """CRUD for Personnel."""
        conn = sqlite3.connect(DB_PATH)
        try:
            if action == "CREATE":
                p_id = f"STAFF-{uuid.uuid4().hex[:4].upper()}"
                conn.execute("""
                    INSERT INTO personnel (id, name, email, role, efficiency_score, status, avatar)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    p_id, data.get('name'), data.get('email'), data.get('role'),
                    data.get('efficiency_score', 0.0), data.get('status', 'Active'),
                    data.get('avatar')
                ))
                conn.commit()
                return {"id": p_id, "status": "CREATED"}
            elif action == "UPDATE":
                conn.execute("""
                    UPDATE personnel SET name=?, email=?, role=?, efficiency_score=?, status=?, avatar=?
                    WHERE id=?
                """, (
                    data.get('name'), data.get('email'), data.get('role'),
                    data.get('efficiency_score'), data.get('status'),
                    data.get('avatar'), data.get('id')
                ))
                conn.commit()
                return {"status": "UPDATED"}
            elif action == "DELETE":
                conn.execute("DELETE FROM personnel WHERE id=?", (data.get('id'),))
                conn.commit()
                return {"status": "DELETED"}
        finally:
            conn.close()

    @staticmethod
    def manage_task(action: str, data: dict):
        """CRUD for Tasks."""
        conn = sqlite3.connect(DB_PATH)
        try:
            if action == "CREATE":
                t_id = f"TASK-{uuid.uuid4().hex[:4].upper()}"
                conn.execute("""
                    INSERT INTO tasks (id, title, description, assignee_id, priority, status, deadline)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    t_id, data.get('title'), data.get('description'), 
                    data.get('assignee_id'), data.get('priority', 'Medium'),
                    data.get('status', 'TODO'), data.get('deadline')
                ))
                conn.commit()
                return {"id": t_id, "status": "CREATED"}
            elif action == "UPDATE_STATUS":
                conn.execute("UPDATE tasks SET status=? WHERE id=?", (data.get('status'), data.get('id')))
                conn.commit()
                return {"status": "UPDATED"}
            elif action == "UPDATE":
                conn.execute("""
                    UPDATE tasks SET title=?, description=?, assignee_id=?, priority=?, status=?, deadline=?
                    WHERE id=?
                """, (
                    data.get('title'), data.get('description'), data.get('assignee_id'),
                    data.get('priority'), data.get('status'), data.get('deadline'),
                    data.get('id')
                ))
                conn.commit()
                return {"status": "UPDATED"}
            elif action == "DELETE":
                conn.execute("DELETE FROM tasks WHERE id=?", (data.get('id'),))
                conn.commit()
                return {"status": "DELETED"}
        finally:
            conn.close()

    @staticmethod
    def manage_schedule(action: str, data: dict):
        """CRUD for Operational Schedules."""
        conn = sqlite3.connect(DB_PATH)
        try:
            if action == "CREATE":
                s_id = f"SCHED-{uuid.uuid4().hex[:4].upper()}"
                conn.execute("""
                    INSERT INTO operational_schedules (id, title, type, date, hours, role_requirement, personnel_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    s_id, data.get('title'), data.get('type', 'SHIFT'),
                    data.get('date'), data.get('hours'), data.get('role_requirement'),
                    data.get('personnel_id')
                ))
                conn.commit()
                return {"id": s_id, "status": "CREATED"}
            elif action == "DELETE":
                conn.execute("DELETE FROM operational_schedules WHERE id=?", (data.get('id'),))
                conn.commit()
                return {"status": "DELETED"}
        finally:
            conn.close()
