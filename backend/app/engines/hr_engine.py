
import pandas as pd
from datetime import datetime
import uuid

class HREngine:
    def __init__(self):
        # In a real app, this would be a DB. For now, we'll use a session-based or mock approach
        self.employees = [
            {"id": "EMP001", "name": "Arjun Sharma", "role": "Senior Developer", "dept": "Engineering", "salary": 125000, "status": "Active", "joined": "2023-01-15"},
            {"id": "EMP002", "name": "Priya Patel", "role": "Product Manager", "dept": "Products", "salary": 110000, "status": "Active", "joined": "2023-03-20"},
            {"id": "EMP003", "name": "Rahul Verma", "role": "Sales Lead", "dept": "Sales", "salary": 95000, "status": "On Leave", "joined": "2022-11-10"},
        ]
        self.attendance = []

    def get_employees(self):
        return self.employees

    def add_employee(self, data):
        new_emp = {
            "id": f"EMP{len(self.employees) + 1:03d}",
            "name": data.get("name"),
            "role": data.get("role"),
            "dept": data.get("dept"),
            "salary": data.get("salary"),
            "status": "Active",
            "joined": datetime.now().strftime("%Y-%m-%d")
        }
        self.employees.append(new_emp)
        return new_emp

    def get_hr_stats(self):
        df = pd.DataFrame(self.employees)
        if df.empty:
            return {}
        return {
            "total_employees": len(df),
            "dept_distribution": df['dept'].value_counts().to_dict(),
            "avg_salary": float(df['salary'].mean()),
            "active_count": len(df[df['status'] == 'Active'])
        }

hr_engine = HREngine()
