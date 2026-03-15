import sqlite3
import os

DB_PATH = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend\data\enterprise.db"

def check_db():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])
    
    for table in ['personnel', 'tasks', 'operational_schedules']:
        if any(table == t[0] for t in tables):
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"Table {table}: {count} records")
        else:
            print(f"Table {table} MISSING")
    
    conn.close()

if __name__ == "__main__":
    check_db()
