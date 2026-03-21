import sqlite3
from app.core.database_manager import DB_PATH
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
print("=== SCHEMAS ===")
for t in ["users", "invoices", "inventory", "ledger", "customers"]:
    try:
        print(f"\n{t}:")
        for col in conn.execute(f"PRAGMA table_info({t})").fetchall():
             print(f"  {dict(col)['name']}: {dict(col)['type']}")
    except Exception as e:
        print(e)
