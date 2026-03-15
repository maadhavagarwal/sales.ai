import pandas as pd
import os

# Create dummy data for Hardcore Test
os.makedirs("tests/hardcore_data", exist_ok=True)

# 1. Invoices (Sales)
invoices = pd.DataFrame({
    'InvoiceNo': ['INV-001', 'INV-002', 'INV-003'],
    'Date': ['2026-01-01', '2026-01-02', '2026-01-03'],
    'CustomerName': ['Global Corp', 'Nexus Ltd', 'Prime Inc'],
    'TotalAmount': [5000, 12000, 3000],
    'Tax': [900, 2160, 540],
    'Status': ['Paid', 'Pending', 'Paid']
})
invoices.to_csv("tests/hardcore_data/invoices_test.csv", index=False)

# 2. Staff (HR)
staff = pd.DataFrame({
    'EmployeeName': ['John Doe', 'Jane Smith', 'Mike Ross'],
    'Role': ['Manager', 'Developer', 'Analyst'],
    'Salary': [80000, 95000, 70000],
    'Department': ['Operations', 'Engineering', 'Finance'],
    'JoinedDate': ['2024-05-10', '2025-01-15', '2025-03-01']
})
staff.to_csv("tests/hardcore_data/staff_test.csv", index=False)

# 3. Inventory (Assets)
inventory = pd.DataFrame({
    'SKU': ['SKU-101', 'SKU-102', 'SKU-103'],
    'ItemName': ['Enterprise Server', 'Workstation Pro', 'Cloud Gateway'],
    'Stock': [50, 20, 100],
    'CostPrice': [2000, 1500, 500],
    'SalePrice': [3500, 2500, 900],
    'Category': ['Hardware', 'Hardware', 'Networking']
})
inventory.to_csv("tests/hardcore_data/inventory_test.csv", index=False)

# 4. Ledger (Finance)
ledger = pd.DataFrame({
    'TxnID': ['TXN-501', 'TXN-502', 'TXN-503'],
    'AccountName': ['Sales Revenue', 'Salary Expense', 'Inventory Purchase'],
    'Debit': [0, 245000, 50000],
    'Credit': [20000, 0, 0],
    'Date': ['2026-03-01', '2026-03-05', '2026-03-10']
})
ledger.to_csv("tests/hardcore_data/ledger_test.csv", index=False)

# 5. Customers (CRM)
customers = pd.DataFrame({
    'CustomerName': ['Alpha Tech', 'Beta Solutions', 'Gamma Systems'],
    'Email': ['admin@alpha.com', 'contact@beta.net', 'info@gamma.org'],
    'Phone': ['9876543210', '9876543211', '9876543212'],
    'GSTIN': ['27AAAAA0000A1Z5', '27BBBBB1111B2Z6', '27CCCCC2222C3Z7'],
    'Address': ['Mumbai, IN', 'Delhi, IN', 'Bangalore, IN']
})
customers.to_csv("tests/hardcore_data/customers_test.csv", index=False)

print("✅ Hardcore test data generated in tests/hardcore_data/")
