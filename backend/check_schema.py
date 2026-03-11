
import sqlite3
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.core.database_manager import DB_PATH

print(f"Checking DB at: {DB_PATH}")
if not os.path.exists(DB_PATH):
    print("DB file NOT found!")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'")
res = cursor.fetchone()
if res:
    print(res[0])
else:
    print("Table 'customers' NOT found!")
conn.close()
