import sqlite3
import os

DB_PATH = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend\data\enterprise.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
for table in ["team_chat", "meetings", "outbound_outreach", "invoices", "customers", "users"]:
    print(f"Schema for {table}:")
    cursor.execute(f"PRAGMA table_info({table})")
    print(cursor.fetchall())
    cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
    print(cursor.fetchone())
conn.close()
