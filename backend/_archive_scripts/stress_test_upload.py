import pandas as pd
import sqlite3
import os
import uuid
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.engines.workspace_engine import WorkspaceEngine
from app.core.database_manager import DB_PATH

def run_stress_test():
    company_id = f"STRESS-{uuid.uuid4().hex[:6].upper()}"
    print(f"Starting Stress Test for Company: {company_id}")

    test_cases = [
        {
            "name": "weird_headers_invoice.csv",
            "data": {
                "Bill No": ["INV001", "INV002"],
                "Client Name": ["Alpha", "Beta"],
                "Total Payable": [5000.50, 12000.75],
                "Bill Date": ["2026-01-15", "15/02/2026"]
            },
            "expected_category": "INVOICE"
        },
        {
            "name": "ledger_style_data.csv",
            "data": {
                "Account Type": ["Asset", "Expense"],
                "Debit": [1000, 200],
                "Credit": [0, 0],
                "Brief": ["Cash deposit", "Office Rent"]
            },
            "expected_category": "LEDGER"
        },
        {
            "name": "scrambled_customers.csv",
            "data": {
                "First Name": ["John", "Jane"],
                "Last Name": ["Doe", "Smith"],
                "Contact": ["9876543210", "1234567890"],
                "Email ID": ["john@example.com", "jane@example.com"],
                "GST Number": ["27AAAAA0000A1Z5", ""]
            },
            "expected_category": "CUSTOMER"
        },
        {
            "name": "inventory_dump.xlsx",
            "data": {
                "Article Name": ["Laptop", "Mouse"],
                "On Hand": [50, 200],
                "Cost": [45000, 500],
                "MRP": [55000, 800],
                "HSN": ["8471", "8471"]
            },
            "expected_category": "INVENTORY"
        }
    ]

    for case in test_cases:
        fname = case["name"]
        df = pd.DataFrame(case["data"])
        
        print(f"\n[Testing] {fname}")
        
        # Determine category using logic under test
        category = WorkspaceEngine.identify_and_segregate_data(df)
        confidence = 1.0 # identify_and_segregate_data no longer returns confidence tuple
        print(f"Detected Category: {category}")
        
        if category == case["expected_category"]:
            print("✅ Category Match")
        else:
            print(f"❌ Category Mismatch! Expected {case['expected_category']}")

        # Process upload
        if fname.endswith(".csv"):
            content = df.to_csv(index=False).encode('utf-8')
        else:
            content = df.to_csv(index=False).encode('utf-8') 
            
        try:
            result = WorkspaceEngine.process_universal_upload(
                user_id=1,
                company_id=company_id,
                files_metadata=[{"name": fname, "content": content}]
            )
            # Result is now a list of processing results
            print(f"Process Result: Success")
        except Exception as e:
            print(f"❌ Process Error: {e}")
            import traceback
            traceback.print_exc()

    # Verify DB counts
    print("\n[Final DB Audit]")
    conn = sqlite3.connect(DB_PATH)
    tables = ["invoices", "customers", "inventory", "ledger", "files_catalog"]
    for table in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {table} WHERE company_id = ?", (company_id,)).fetchone()[0]
        print(f"Table {table:15} | Records: {count}")
    conn.close()

if __name__ == "__main__":
    run_stress_test()
