"""
Debug: Simulate what happens when a CSV is uploaded during registration.
Tests the full chain: identify → process → check DB.
"""
import sys, io, sqlite3
sys.path.insert(0, '.')
from app.engines.workspace_engine import WorkspaceEngine
from app.core.database_manager import DB_PATH
import pandas as pd

# ─── 1. Show recent companies so we can pick one ─────────────────────────────
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
companies = conn.execute("SELECT id, name FROM company_profiles ORDER BY rowid DESC LIMIT 5").fetchall()
print("=== COMPANIES ===")
for c in companies: print(f"  {c['id'][:8]}... | {c['name']}")

users = conn.execute("SELECT id, email, company_id FROM users ORDER BY id DESC LIMIT 5").fetchall()
print("\n=== USERS ===")
for u in users: print(f"  user_id={u['id']} | {u['email']} | company_id={str(u['company_id'])[:8]}...")

if not companies:
    print("\nNo companies found. Register first then run this test.")
    sys.exit(0)

test_company = dict(companies[0])
test_user = dict(users[0])
company_id = test_company['id']
user_id = test_user['id']
print(f"\n--- Testing with company_id={company_id[:8]}... user_id={user_id} ---\n")

# ─── 2. Count invoices BEFORE upload ─────────────────────────────────────────
before = conn.execute("SELECT COUNT(*) FROM invoices WHERE company_id=?", (company_id,)).fetchone()[0]
print(f"Invoices before upload: {before}")

# ─── 3. Create a sample CSV identical to what a user might upload ────────────
csv_samples = {
    "sales_data.csv": """Date,Customer Name,Invoice No,Amount,Description
2024-01-15,Ramesh Traders,INV-001,45000,Software License
2024-02-10,Suresh & Co,INV-002,32500,Consulting Services
2024-03-05,Priya Enterprises,INV-003,78000,Hardware Supply
2024-04-20,Kumar Industries,INV-004,15000,Maintenance
""",
    "customers.csv": """Customer Name,Email,Phone,City,GSTIN
Ramesh Traders,ramesh@traders.com,9876543210,Mumbai,27AABCR1234A1Z5
Suresh & Co,suresh@co.in,9123456789,Delhi,07AABCS9876B1Z4
Priya Enterprises,priya@ent.com,9988776655,Bangalore,29AABCP5432C1Z3
""",
}

for fname, csv_content in csv_samples.items():
    content = csv_content.encode("utf-8")
    df = pd.read_csv(io.BytesIO(content))
    category = WorkspaceEngine.identify_and_segregate_data(df)
    print(f"\n[{fname}] → Category: {category}")
    print(f"  Columns: {list(df.columns)}")

# ─── 4. Run actual upload ─────────────────────────────────────────────────────
print("\n--- Running process_universal_upload ---")
files_meta = [
    {"name": fname, "content": content.encode("utf-8")}
    for fname, content in csv_samples.items()
]
# Re-encode properly
files_meta = []
for fname, csv_content in csv_samples.items():
    files_meta.append({"name": fname, "content": csv_content.encode("utf-8")})

try:
    result = WorkspaceEngine.process_universal_upload(user_id, company_id, files_meta)
    print(f"\nResult: {result}")
except Exception as e:
    import traceback
    print(f"ERROR: {e}")
    traceback.print_exc()

# ─── 5. Count invoices AFTER upload ──────────────────────────────────────────
after = conn.execute("SELECT COUNT(*) FROM invoices WHERE company_id=?", (company_id,)).fetchone()[0]
print(f"\nInvoices after upload: {after} (added {after - before})")

customers_count = conn.execute("SELECT COUNT(*) FROM customers WHERE company_id=?", (company_id,)).fetchone()[0]
print(f"Customers in DB: {customers_count}")

conn.close()
