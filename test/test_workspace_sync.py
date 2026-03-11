
import sqlite3
import pandas as pd
import os
import sys
from datetime import datetime

# Add the backend directory to sys.path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.engines.workspace_engine import WorkspaceEngine
from app.core.database_manager import DB_PATH

def test_workspace_sync():
    print("🧪 Starting Workspace Sync Verification Test...")
    
    # 1. Create a mock dataframe
    data = {
        'Customer Name': ['Test Customer Alpha'],
        'Total Revenue': [5000.0],
        'Product': ['AI Integration Service'],
        'Date': [datetime.now().strftime("%Y-%m-%d")]
    }
    df = pd.DataFrame(data)
    
    # 2. Check initial state
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Ensure customer exists
    cursor.execute("INSERT OR IGNORE INTO customers (name, total_spend) VALUES (?, 0)", ('Test Customer Alpha',))
    conn.commit()
    
    cursor.execute("SELECT total_spend FROM customers WHERE name = ?", ('Test Customer Alpha',))
    initial_spend = cursor.fetchone()[0]
    print(f"Initial Spend for Test Customer Alpha: {initial_spend}")
    conn.close()
    
    # 3. Trigger Sync
    print("Syncing data...")
    result = WorkspaceEngine.sync_dataset_to_workspace(df)
    print(f"Sync Result: {result}")
    
    # 4. Verify updated state
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT total_spend FROM customers WHERE name = ?", ('Test Customer Alpha',))
    final_spend = cursor.fetchone()[0]
    print(f"Final Spend for Test Customer Alpha: {final_spend}")
    conn.close()
    
    if final_spend == initial_spend + 5000.0:
        print("✅ SUCCESS: Customer total_spend updated correctly!")
    else:
        print("❌ FAILURE: Customer total_spend did not update correctly.")

if __name__ == "__main__":
    test_workspace_sync()
