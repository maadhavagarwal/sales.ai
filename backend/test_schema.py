import sqlite3
from app.core.database_manager import DB_PATH
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
print([dict(r) for r in conn.execute("PRAGMA table_info(invoices)").fetchall()])
