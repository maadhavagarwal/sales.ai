import sqlite3
import os

DB_PATH = 'data/enterprise.db'
if not os.path.exists(DB_PATH):
    print(f"Error: {DB_PATH} not found")
    exit(1)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
company_id = 'COMP-001' # Sample ID from audit script

try:
    print("Executing Daybook query...")
    query = """
        SELECT 'INVOICE' as category, invoice_number as doc_id, date, customer_id as party, grand_total as amount, status
        FROM invoices WHERE company_id = ?
        UNION ALL
        SELECT type as category, COALESCE(voucher_no, voucher_id) as doc_id, date, account_name as party, amount, 'PAID' as status
        FROM ledger WHERE company_id = ? AND voucher_type != 'INVOICE'
        ORDER BY date DESC
    """
    res = conn.execute(query, (company_id, company_id)).fetchall()
    print(f"Success! Found {len(res)} entries.")
    if res:
        print(dict(res[0]))
except Exception as e:
    print(f"FAILED: {e}")
finally:
    conn.close()
