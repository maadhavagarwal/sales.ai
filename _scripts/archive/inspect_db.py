
import sqlite3
import os

db_path = "backend/database.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table in tables:
    print(f"\nTable: {table[0]}")
    cursor.execute(f"PRAGMA table_info({table[0]})")
    cols = cursor.fetchall()
    for col in cols:
        print(f"  {col[1]} ({col[2]})")
conn.close()
