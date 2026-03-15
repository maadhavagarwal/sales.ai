import sqlite3
import os

DB_PATH = 'data/enterprise.db'

def inspect_db():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"Tables: {tables}")
    
    # Inspect schema of ledger and invoices
    for table in ['ledger', 'invoices', 'users']:
        if table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [r[1] for r in cursor.fetchall()]
            print(f"Columns for {table}: {cols}")
    
    conn.close()

if __name__ == "__main__":
    inspect_db()
