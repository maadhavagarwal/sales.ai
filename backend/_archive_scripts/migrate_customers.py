
import sqlite3
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.core.database_manager import DB_PATH

def migrate():
    print(f"Migrating DB at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if UNIQUE exists
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'")
        sql = cursor.fetchone()[0]
        if "UNIQUE" in sql:
            print("Table 'customers' already has UNIQUE constraint.")
            return

        print("Updating 'customers' table to include UNIQUE(name)...")
        
        # 1. Rename existing
        cursor.execute("ALTER TABLE customers RENAME TO customers_old")
        
        # 2. Create new with UNIQUE
        cursor.execute("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                gstin TEXT,
                pan TEXT,
                total_spend REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. Copy data
        cursor.execute("""
            INSERT INTO customers (id, name, email, phone, address, gstin, pan, total_spend, created_at)
            SELECT id, name, email, phone, address, gstin, pan, total_spend, created_at FROM customers_old
        """)
        
        # 4. Drop old
        cursor.execute("DROP TABLE customers_old")
        
        conn.commit()
        print("Migration successful!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
