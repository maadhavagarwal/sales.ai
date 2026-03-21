import sqlite3
from pathlib import Path
import os

# Find database
db_path = Path("backend/app/data/app.db")
if not db_path.exists():
    db_path = Path("backend/database.db")
    if not db_path.exists():
        print("Checking for .db files...")
        for root, dirs, files in os.walk("backend"):
            for f in files:
                if f.endswith(".db"):
                    print(f"Found: {os.path.join(root, f)}")
                    db_path = Path(os.path.join(root, f))
                    break

print(f"Using database: {db_path}")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print("\n=== Portal/Customer Tables ===")
    portal_tables = []
    for (table_name,) in tables:
        if 'portal' in table_name.lower() or 'customer' in table_name.lower():
            portal_tables.append(table_name)
            print(f"✓ {table_name}")
    
    if not portal_tables:
        print("✗ No portal tables found")
    
    print("\n=== Analytics Tables ===")
    analytics_tables = []
    for (table_name,) in tables:
        if 'analytics' in table_name.lower() or 'event' in table_name.lower() or 'feature' in table_name.lower():
            analytics_tables.append(table_name)
            print(f"✓ {table_name}")
    
    if not analytics_tables:
        print("✗ No analytics tables found")
    
    print("\n=== All Tables Count ===")
    print(f"Total: {len(tables)} tables")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
