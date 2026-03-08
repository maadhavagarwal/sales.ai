import sys
import os

# Add the project root to sys.path
sys.path.append(r'c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend')

from app.engines.workspace_engine import WorkspaceEngine
from app.core.database_manager import DB_PATH

print(f"DB_PATH: {DB_PATH}")
print(f"Exists: {os.path.exists(DB_PATH)}")

try:
    res = WorkspaceEngine.get_inventory()
    print("Invetory success:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
