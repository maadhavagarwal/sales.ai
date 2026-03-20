import sqlite3
import os
import pathlib

# Try to find the DB relative to this script
script_dir = pathlib.Path(__file__).parent.absolute()
db_path = script_dir / "data" / "enterprise.db"

if not db_path.exists():
    db_path = pathlib.Path(r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend\data\enterprise.db")

print(f"Checking database at: {db_path}")

if not db_path.exists():
    print("Database file does not exist.")
else:
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM users")
        emails = cursor.fetchall()
        print(f"Registered Emails count: {len(emails)}")
        for email in emails:
            print(f"- {email[0]}")
        conn.close()
    except Exception as e:
        print(f"Error querying database: {e}")
