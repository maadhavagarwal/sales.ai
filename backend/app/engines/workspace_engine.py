import sqlite3
import uuid
import json
from datetime import datetime
from app.core.database_manager import DB_PATH

class WorkspaceEngine:
    @staticmethod
    def create_invoice(data: dict):
        """
        Creates a new professional GST-compliant invoice and syncs to General Ledger.
        """
        invoice_id = f"GST-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        conn = sqlite3.connect(DB_PATH)
        try:
            items_json = json.dumps(data.get('items', []))
            tax_data = data.get('tax_totals', {})
            grand_total = data.get('grand_total', 0)
            
            # 1. Save Invoice
            conn.execute("""
                INSERT INTO invoices (
                    id, invoice_number, customer_id, customer_gstin, customer_pan, 
                    date, due_date, items_json, subtotal, total_tax, 
                    cgst_total, sgst_total, igst_total, grand_total, notes, currency
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                invoice_id, invoice_id, data.get('customer_id'),
                data.get('client_gstin'), data.get('client_pan'),
                datetime.now().strftime("%Y-%m-%d"), data.get('due_date'),
                items_json, data.get('subtotal'), tax_data.get('total', 0),
                tax_data.get('cgst', 0), tax_data.get('sgst', 0),
                tax_data.get('igst', 0), grand_total,
                data.get('notes'), data.get('currency', '₹')
            ))

            # 2. Sync to Ledger as INCOME
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                f"Sales Revenue - {invoice_id}",
                "INCOME",
                grand_total,
                f"Statutory invoice authorized for {data.get('customer_id')}",
                datetime.now().strftime("%Y-%m-%d")
            ))

            conn.commit()
            return {"status": "success", "invoice_id": invoice_id}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def get_invoices():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM invoices ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def add_customer(data: dict):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO customers (name, email, phone, address, gstin, pan)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                data.get('name'), 
                data.get('email'), 
                data.get('phone'), 
                data.get('address'),
                data.get('gstin'),
                data.get('pan')
            ))
            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def get_customers():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM customers")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def create_marketing_campaign(data: dict):
        """Creates campaign and syncs spend to Ledger as EXPENSE."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO marketing_campaigns (name, channel, spend, conversions, revenue_generated, start_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                data.get('name'), data.get('channel'), data.get('spend'), 
                data.get('conversions', 0), data.get('revenue_generated', 0), 
                datetime.now().strftime("%Y-%m-%d")
            ))

            # Sync to Ledger
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                f"Marketing Spend - {data.get('name')}",
                "EXPENSE",
                data.get('spend'),
                f"Campaign on {data.get('channel')}",
                datetime.now().strftime("%Y-%m-%d")
            ))

            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def get_marketing_campaigns():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM marketing_campaigns ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def add_inventory_item(data: dict):
        """Onboards new physical items and syncs cost to Ledger as ASSET."""
        conn = sqlite3.connect(DB_PATH)
        try:
            total_cost = data.get('quantity', 0) * data.get('cost_price', 0)
            conn.execute("""
                INSERT INTO inventory (sku, name, quantity, cost_price, sale_price, category)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                data.get('sku'), data.get('name'), data.get('quantity', 0), 
                data.get('cost_price'), data.get('sale_price'), data.get('category')
            ))

            # Sync to Ledger
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                f"Inventory Acquisition - {data.get('sku')}",
                "ASSET",
                total_cost,
                f"Boarded {data.get('quantity')} units of {data.get('name')}",
                datetime.now().strftime("%Y-%m-%d")
            ))

            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def get_inventory():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM inventory")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def update_inventory(sku, qty_change):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("UPDATE inventory SET quantity = quantity + ? WHERE sku = ?", (qty_change, sku))
            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def add_expense(data: dict):
        """Records an expense and syncs it to the Ledger."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO expenses (category, amount, description, date)
                VALUES (?, ?, ?, ?)
            """, (data.get('category'), data.get('amount'), data.get('description'), datetime.now().strftime("%Y-%m-%d")))

            # Sync to Ledger
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                f"Expense - {data.get('category')}",
                "EXPENSE",
                data.get('amount'),
                data.get('description'),
                datetime.now().strftime("%Y-%m-%d")
            ))

            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def get_expenses():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM expenses ORDER BY date DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def add_ledger_entry(data: dict):
        """Records a new statutory financial movement."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                data.get('account_name'),
                data.get('type'),
                data.get('amount'),
                data.get('description'),
                datetime.now().strftime("%Y-%m-%d")
            ))
            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def get_ledger():
        """Retrieves the full generalized ledger for financial audit."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ledger ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def get_financial_statements():
        """Generates real-time Balance Sheet and P&L metrics."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            # Summary by type
            cursor.execute("SELECT type, SUM(amount) as total FROM ledger GROUP BY type")
            summary = {row['type']: row['total'] for row in cursor.fetchall()}
            
            # Additional detail for Balance Sheet
            return {
                "assets": summary.get('ASSET', 0),
                "liabilities": summary.get('LIABILITY', 0),
                "equity": summary.get('ASSET', 0) - summary.get('LIABILITY', 0),
                "revenue": summary.get('INCOME', 0),
                "expenses": summary.get('EXPENSE', 0),
                "net_profit": summary.get('INCOME', 0) - summary.get('EXPENSE', 0)
            }
        finally:
            conn.close()

    @staticmethod
    def add_accounting_note(data: dict):
        """Records a statutory Debit or Credit note."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO notes (note_type, customer_id, reference_invoice, amount, tax_amount, reason, date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('note_type'),
                data.get('customer_id'),
                data.get('reference_invoice'),
                data.get('amount'),
                data.get('tax_amount', 0),
                data.get('reason'),
                datetime.now().strftime("%Y-%m-%d")
            ))
            # Also record in ledger for consolidated audit
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                f"Statutory {data.get('note_type')} Note",
                "EXPENSE" if data.get('note_type') == 'DEBIT' else "INCOME",
                data.get('amount'),
                f"Ref: {data.get('reference_invoice')} - {data.get('reason')}",
                datetime.now().strftime("%Y-%m-%d")
            ))
            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def get_accounting_notes():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notes ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
