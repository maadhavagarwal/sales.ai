"""
Test CSV category detection using the actual engine function.
"""
import sys
import pandas as pd
sys.path.insert(0, '.')

from app.engines.workspace_engine import WorkspaceEngine

test_dfs = {
    "Generic Invoice (Date/Customer/Amount)": pd.DataFrame(columns=["Date", "Customer", "Amount", "Description"]),
    "Tally Invoice Export": pd.DataFrame(columns=["Date", "Party", "Inv No", "Grand Total"]),
    "Sales Sheet": pd.DataFrame(columns=["Invoice Date", "Bill No", "Item", "Qty", "Price", "Total"]),
    "Simple Sales (Revenue/Category)": pd.DataFrame(columns=["Date", "Sales", "Revenue", "Category"]),
    "Customer List": pd.DataFrame(columns=["Name", "Email", "Phone", "City", "Address"]),
    "CRM Data": pd.DataFrame(columns=["Customer Name", "Contact Person", "GSTIN", "Phone"]),
    "Inventory": pd.DataFrame(columns=["Item Name", "SKU", "Quantity", "Stock", "Category"]),
    "Ledger": pd.DataFrame(columns=["Account Name", "Debit", "Credit", "Balance", "Voucher"]),
    "Staff": pd.DataFrame(columns=["Employee Name", "Designation", "Salary", "Department"]),
    "Vague CSV": pd.DataFrame(columns=["Col1", "Col2", "Col3"]),
}

print("=== CSV CATEGORY DETECTION TEST ===\n")
for name, df in test_dfs.items():
    cat = WorkspaceEngine.identify_and_segregate_data(df)
    status = "✅" if cat != "UNSUPPORTED" else "❌"
    print(f"{status} [{name}] → {cat}")

if len(sys.argv) > 1:
    print(f"\n--- Testing actual file: {sys.argv[1]} ---")
    df = pd.read_csv(sys.argv[1])
    print(f"Columns: {list(df.columns)}")
    cat = WorkspaceEngine.identify_and_segregate_data(df)
    print(f"Category: {cat}")
