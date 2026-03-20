from datetime import datetime

import pandas as pd


class HREngine:
    def __init__(self):
        # In a real app, this would be a DB. For now, we'll use a session-based or mock approach
        self.employees = [
            {
                "id": "EMP001",
                "name": "Arjun Sharma",
                "role": "Senior Developer",
                "dept": "Engineering",
                "salary": 125000,
                "status": "Active",
                "joined": "2023-01-15",
            },
            {
                "id": "EMP002",
                "name": "Priya Patel",
                "role": "Product Manager",
                "dept": "Products",
                "salary": 110000,
                "status": "Active",
                "joined": "2023-03-20",
            },
            {
                "id": "EMP003",
                "name": "Rahul Verma",
                "role": "Sales Lead",
                "dept": "Sales",
                "salary": 95000,
                "status": "On Leave",
                "joined": "2022-11-10",
            },
        ]
        self.attendance = []

    def get_employees(self, company_id: str = "DEFAULT"):
        import sqlite3
        from app.core.database_manager import DB_PATH
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM personnel WHERE company_id = ?", (company_id,))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    def add_employee(self, data):
        import sqlite3
        from app.core.database_manager import DB_PATH
        conn = sqlite3.connect(DB_PATH)
        try:
            emp_id = data.get("id") or f"STAFF-{uuid.uuid4().hex[:6].upper()}"
            company_id = data.get("company_id", "DEFAULT")
            conn.execute(
                """
                INSERT INTO personnel (id, name, email, role, efficiency_score, status, company_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    emp_id,
                    data.get("name"),
                    data.get("email"),
                    data.get("role"),
                    data.get("efficiency_score", 0.0),
                    data.get("status", "Active"),
                    company_id
                ),
            )
            conn.commit()
            return {"status": "success", "id": emp_id}
        finally:
            conn.close()

    def get_hr_stats(self, company_id: str = "DEFAULT"):
        import sqlite3
        from app.core.database_manager import DB_PATH
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            df = pd.read_sql("SELECT * FROM personnel WHERE company_id = ?", conn, params=(company_id,))
            if df.empty:
                return {
                    "total_employees": 0,
                    "dept_distribution": {},
                    "avg_salary": 0.0,
                    "active_count": 0,
                }
            # Note: personnel table doesn't have 'salary' or 'dept' by default, 
            # but we can calculate from roles or add columns if needed.
            # Using 'role' as proxy for 'dept' if 'dept' missing
            dept_col = "dept" if "dept" in df.columns else "role"
            return {
                "total_employees": len(df),
                "dept_distribution": df[dept_col].value_counts().to_dict() if dept_col in df.columns else {},
                "avg_salary": float(df["salary"].mean()) if "salary" in df.columns else 0.0,
                "active_count": len(df[df["status"] == "Active"]) if "status" in df.columns else 0,
            }
        finally:
            conn.close()


hr_engine = HREngine()
