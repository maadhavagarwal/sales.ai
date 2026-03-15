
import sqlite3
import os

db_path = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend\data\enterprise.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Marketing Campaigns Table ---")
try:
    cursor.execute("PRAGMA table_info(marketing_campaigns)")
    cols = [r[1] for r in cursor.fetchall()]
    print(f"Columns: {cols}")
except Exception as e:
    print(f"Error: {e}")

conn.close()
