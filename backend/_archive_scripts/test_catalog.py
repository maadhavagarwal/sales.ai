import sqlite3, sys
sys.path.insert(0, '.')
from app.core.database_manager import DB_PATH
import pandas as pd

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

with open('test_catalog_output.txt', 'w', encoding='utf-8') as f:
    f.write("=== FILES CATALOG ===\n")
    logs = conn.execute("SELECT * FROM files_catalog ORDER BY uploaded_at DESC LIMIT 5").fetchall()
    for log in logs:
        f.write(str(dict(log)) + "\n")

    f.write("\n=== RECENT INVOICES ===\n")
    invs = conn.execute("SELECT * FROM invoices ORDER BY id DESC LIMIT 5").fetchall()
    for i in invs:
        f.write(str(dict(i)) + "\n")
    
conn.close()
