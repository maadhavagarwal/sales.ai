import sqlite3, sys
sys.path.insert(0, '.')
from app.core.database_manager import DB_PATH
conn = sqlite3.connect(DB_PATH)
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", sorted(tables))
# Check users table
conn.row_factory = sqlite3.Row
users = conn.execute("SELECT id, email, company_id FROM users ORDER BY id DESC LIMIT 5").fetchall()
print("\nUsers:")
for u in users:
    print(f"  id={u['id']} email={u['email']} company_id={u['company_id']}")
conn.close()
