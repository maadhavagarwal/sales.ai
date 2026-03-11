
import sqlite3
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.core.database_manager import DB_PATH, init_workspace_db
from app.engines.workspace_engine import WorkspaceEngine

def test_crm_and_migration():
    print("--- Testing Database Migration & CRM ---")
    
    # Reset DB for test or use current
    print(f"Using DB at: {DB_PATH}")
    
    # 1. Run initialization (Verifies migration logic)
    try:
        init_workspace_db()
        print("✅ Database initialized/migrated successfully.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return

    # 2. Test Add Customer (Statutory)
    test_customer = {
        "name": "Antigravity Test Entity",
        "email": "test@antigravity.ai",
        "phone": "9998887776",
        "address": "123 Agent Lane, Silicon Valley",
        "gstin": "27AAAAA0000A1Z5",
        "pan": "ABCDE1234F"
    }
    
    print("\n--- Testing Add Customer ---")
    res = WorkspaceEngine.add_customer(test_customer)
    if res.get("status") == "success":
        print("✅ Customer added successfully.")
    else:
        print(f"❌ Failed to add customer: {res.get('message')}")
        return

    # 3. Verify in DB
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE name = ?", (test_customer["name"],))
        row = cursor.fetchone()
        if row:
            print(f"✅ Verified customer in DB: {row['name']}")
            print(f"   GSTIN: {row['gstin']}")
            print(f"   PAN: {row['pan']}")
            print(f"   Phone: {row['phone']}")
        else:
            print("❌ Customer not found in DB after insertion!")
    finally:
        conn.close()

    # 4. Test Marketing Hub NaN fix (Internal logic)
    print("\n--- Testing Marketing Hub Logic ---")
    test_campaign = {
        "name": "RL Launch",
        "channel": "Meta",
        "spend": 5000.50,
        "conversions": 12,
        "revenue_generated": 15000.00
    }
    res = WorkspaceEngine.create_marketing_campaign(test_campaign)
    if res.get("status") == "success":
        print("✅ Marketing campaign created successfully.")
    else:
        print(f"❌ Failed to create campaign: {res.get('message')}")

if __name__ == "__main__":
    test_crm_and_migration()
