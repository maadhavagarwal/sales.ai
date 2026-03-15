import sqlite3
import os

DB_PATH = "data/enterprise.db"

def list_users():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.execute("SELECT * FROM users")
    users = cursor.fetchall()
    
    if not users:
        print("No users found.")
    else:
        for user in users:
            print(dict(user))
    conn.close()

if __name__ == "__main__":
    list_users()
