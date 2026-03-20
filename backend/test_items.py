import sqlite3
from app.core.database_manager import DB_PATH
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
print("=== ITEMS ===")
rows = conn.execute("SELECT company_id, id, grand_total, items_json FROM invoices WHERE company_id='87EB684E' LIMIT 5").fetchall()
for r in rows:
    print(dict(r))
