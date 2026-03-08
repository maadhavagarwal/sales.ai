import sqlite3
import uuid
import json
from datetime import datetime
from app.core.database_manager import DB_PATH

class WorkspaceEngine:
    @staticmethod
    def create_invoice(data: dict):
        """
        Creates a new professional GST-compliant invoice and syncs to General Ledger via Double-Entry.
        Syncs: AR (Asset), Revenue (Income), GST (Liability), COGS (Expense), Inventory (Asset)
        """
        invoice_id = f"GST-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        conn = sqlite3.connect(DB_PATH)
        try:
            items = data.get('items', [])
            items_json = json.dumps(items)
            tax_data = data.get('tax_totals', {})
            subtotal = data.get('subtotal', 0)
            grand_total = data.get('grand_total', 0)
            total_tax = tax_data.get('total', 0)
            
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
                items_json, subtotal, total_tax,
                tax_data.get('cgst', 0), tax_data.get('sgst', 0),
                tax_data.get('igst', 0), grand_total,
                data.get('notes'), data.get('currency', '₹')
            ))

            # 2. Sync Core Sales to Ledger
            # Accounts Receivable (Asset Increase)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Accounts Receivable - {invoice_id}", "ASSET", grand_total, f"Due from {data.get('customer_id')}", datetime.now().strftime("%Y-%m-%d")))
            
            # Sales Revenue (Income Increase)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Sales Revenue - {invoice_id}", "INCOME", subtotal, f"Product/Service Revenue", datetime.now().strftime("%Y-%m-%d")))
            
            # GST Liability (Liability Increase)
            if total_tax > 0:
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"GST Output - {invoice_id}", "LIABILITY", total_tax, f"Statutory Tax Liability", datetime.now().strftime("%Y-%m-%d")))

            # 3. Inventory Deduction & COGS Calculation
            for item in items:
                sku = item.get('inventory_id')
                if sku:
                    qty = item.get('qty', 0)
                    # Get cost price from inventory
                    cursor = conn.cursor()
                    cursor.execute("SELECT name, cost_price FROM inventory WHERE sku = ?", (sku,))
                    res = cursor.fetchone()
                    if res:
                        name, cost_price = res
                        total_cost = qty * cost_price
                        
                        # Update quantity
                        conn.execute("UPDATE inventory SET quantity = quantity - ? WHERE sku = ?", (qty, sku))
                        
                        # Record COGS (Expense Increase)
                        conn.execute("""
                            INSERT INTO ledger (account_name, type, amount, description, date)
                            VALUES (?, ?, ?, ?, ?)
                        """, (f"COGS - {sku}", "EXPENSE", total_cost, f"Cost of {qty} units of {name}", datetime.now().strftime("%Y-%m-%d")))
                        
                        # Decrease Inventory Asset
                        conn.execute("""
                            INSERT INTO ledger (account_name, type, amount, description, date)
                            VALUES (?, ?, ?, ?, ?)
                        """, (f"Inventory Stock Decrease - {sku}", "ASSET", -total_cost, f"Stock reduction for {invoice_id}", datetime.now().strftime("%Y-%m-%d")))

            conn.commit()
            return {"status": "success", "invoice_id": invoice_id}
        except Exception as e:
            conn.rollback()
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
            """, (data.get('name'), data.get('email'), data.get('phone'), data.get('address'), data.get('gstin'), data.get('pan')))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            conn.rollback()
            return {"status": "error", "message": str(e)}
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
        """Creates campaign and syncs to Ledger with Asset Offset (Cash)."""
        conn = sqlite3.connect(DB_PATH)
        try:
            spend = data.get('spend', 0)
            conn.execute("""
                INSERT INTO marketing_campaigns (name, channel, spend, conversions, revenue_generated, start_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (data.get('name'), data.get('channel'), spend, data.get('conversions', 0), data.get('revenue_generated', 0), datetime.now().strftime("%Y-%m-%d")))

            # Expense Increase
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Marketing Spend - {data.get('name')}", "EXPENSE", spend, f"Campaign on {data.get('channel')}", datetime.now().strftime("%Y-%m-%d")))
            
            # Asset Decrease (Assume Paid from Bank)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Bank Payment - Marketing", "ASSET", -spend, f"Paid for campaign: {data.get('name')}", datetime.now().strftime("%Y-%m-%d")))

            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def add_inventory_item(data: dict):
        """Onboards new physical items and syncs cost to Ledger with Asset Offset."""
        conn = sqlite3.connect(DB_PATH)
        try:
            total_cost = data.get('quantity', 0) * data.get('cost_price', 0)
            conn.execute("""
                INSERT INTO inventory (sku, name, quantity, cost_price, sale_price, category, hsn_code)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (data.get('sku'), data.get('name'), data.get('quantity', 0), data.get('cost_price'), data.get('sale_price'), data.get('category'), data.get('hsn_code')))

            # Inventory Asset Increase
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Inventory Asset - {data.get('sku')}", "ASSET", total_cost, f"Boarded {data.get('quantity')} units of {data.get('name')}", datetime.now().strftime("%Y-%m-%d")))
            
            # Bank Asset Decrease (Assume Paid)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Bank Payment - Inventory", "ASSET", -total_cost, f"Purchase of stock: {data.get('sku')}", datetime.now().strftime("%Y-%m-%d")))

            conn.commit()
            return {"status": "success"}
        except Exception as e:
            conn.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def add_expense(data: dict):
        """Records an expense and syncs it with Asset Offset."""
        conn = sqlite3.connect(DB_PATH)
        try:
            amount = data.get('amount', 0)
            conn.execute("""
                INSERT INTO expenses (category, amount, description, date)
                VALUES (?, ?, ?, ?)
            """, (data.get('category'), amount, data.get('description'), datetime.now().strftime("%Y-%m-%d")))

            # Expense Increase
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Expense - {data.get('category')}", "EXPENSE", amount, data.get('description'), datetime.now().strftime("%Y-%m-%d")))
            
            # Asset Decrease (Bank)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (f"Bank Payment - Expense", "ASSET", -amount, f"Payment for {data.get('category')}", datetime.now().strftime("%Y-%m-%d")))

            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def add_ledger_entry(data: dict):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date)
                VALUES (?, ?, ?, ?, ?)
            """, (data.get('account_name'), data.get('type'), data.get('amount'), data.get('description'), datetime.now().strftime("%Y-%m-%d")))
            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()

    @staticmethod
    def get_ledger():
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
        """Generates real-time Balance Sheet and P&L metrics with signed reconciliation."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT type, SUM(amount) as total FROM ledger GROUP BY type")
            summary = {row['type']: row['total'] for row in cursor.fetchall()}
            
            assets = summary.get('ASSET', 0)
            liabilities = summary.get('LIABILITY', 0)
            revenue = summary.get('INCOME', 0)
            expenses = summary.get('EXPENSE', 0)
            net_profit = revenue - expenses
            
            return {
                "assets": assets,
                "liabilities": liabilities,
                "equity": assets - liabilities,
                "revenue": revenue,
                "expenses": expenses,
                "net_profit": net_profit
            }
        finally:
            conn.close()

    @staticmethod
    def add_accounting_note(data: dict):
        """Records a statutory Note and syncs with Balance Sheet offset."""
        conn = sqlite3.connect(DB_PATH)
        try:
            amount = data.get('amount', 0)
            conn.execute("""
                INSERT INTO notes (note_type, customer_id, reference_invoice, amount, tax_amount, reason, date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (data.get('note_type'), data.get('customer_id'), data.get('reference_invoice'), amount, data.get('tax_amount', 0), data.get('reason'), datetime.now().strftime("%Y-%m-%d")))
            
            # Statutory Link
            if data.get('note_type') == 'DEBIT':
                # Debit Note: Customer owes us more (Asset increase) or we owe them less (Liability decrease)
                # For simplicity: Increase AR (Asset) and Revenue (Income)
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"Debit Note Adjust - {data.get('reference_invoice')}", "ASSET", amount, f"Upward adjustment for {data.get('customer_id')}", datetime.now().strftime("%Y-%m-%d")))
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"Revenue Adjust (Debit Note)", "INCOME", amount, f"Ref: {data.get('reference_invoice')}", datetime.now().strftime("%Y-%m-%d")))
            else:
                # Credit Note: We owe customer (Liability increase) or they owe us less (Asset decrease)
                # For simplicity: Decrease AR (Asset) and Revenue (Income)
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"Credit Note Adjust - {data.get('reference_invoice')}", "ASSET", -amount, f"Downward adjustment for {data.get('customer_id')}", datetime.now().strftime("%Y-%m-%d")))
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"Revenue Adjust (Credit Note)", "INCOME", -amount, f"Ref: {data.get('reference_invoice')}", datetime.now().strftime("%Y-%m-%d")))
            
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
    
    @staticmethod
    def get_inventory_analytics():
        """Aggregated stock metrics for the dashboard."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT SUM(quantity * cost_price) as total_value, COUNT(*) as unique_skus, SUM(quantity) as total_units FROM inventory")
            return dict(cursor.fetchone())
        finally:
            conn.close()
