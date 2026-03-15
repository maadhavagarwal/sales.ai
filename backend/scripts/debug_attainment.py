
import sys
import os
import sqlite3

# Add backend to path
sys.path.append(r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend")

from app.engines.workspace_engine import WorkspaceEngine

try:
    res = WorkspaceEngine.manage_sales_targets("GET_ATTAINMENT", {"rep_id": 1, "month": "03-2026"})
    print(f"Result: {res}")
except Exception as e:
    import traceback
    traceback.print_exc()
