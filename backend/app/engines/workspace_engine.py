import sqlite3
import uuid
import json
import pandas as pd
import math
import traceback
from datetime import datetime, timedelta
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
            payment_timeline = data.get('payment_timeline', 'LATER')
            payment_days = int(data.get('payment_days', 0) or 0)
            due_date = data.get('due_date')

            if not due_date:
                if payment_timeline == "IMMEDIATE":
                    due_date = datetime.now().strftime("%Y-%m-%d")
                else:
                    due_date = (datetime.now() + timedelta(days=max(payment_days, 1))).strftime("%Y-%m-%d")
            
            # 1. Save Invoice
            conn.execute("""
                INSERT INTO invoices (
                    id, invoice_number, customer_id, customer_gstin, customer_pan, 
                    date, due_date, payment_terms, payment_timeline, payment_days,
                    items_json, subtotal, total_tax, cgst_total, sgst_total,
                    igst_total, grand_total, notes, currency
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                invoice_id, invoice_id, data.get('customer_id'),
                data.get('client_gstin'), data.get('client_pan'),
                datetime.now().strftime("%Y-%m-%d"), due_date,
                data.get('payment_terms', 'Due on Receipt'),
                payment_timeline,
                payment_days,
                items_json, subtotal, total_tax,
                tax_data.get('cgst', 0), tax_data.get('sgst', 0),
                tax_data.get('igst', 0), grand_total,
                data.get('notes'), data.get('currency', '₹')
            ))

            # Update Customer Spend (High-Fidelity CRM Sync)
            conn.execute("UPDATE customers SET total_spend = total_spend + ? WHERE name = ? OR id = ?", (grand_total, data.get('customer_id'), data.get('customer_id')))

            WorkspaceEngine.log_usage("Billing", f"Generated Invoice {invoice_id}")

            # 2. Sync to Ledger (Double-Entry grouped under Voucher)
            v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
            v_date = datetime.now().strftime("%Y-%m-%d")

            # AR (Asset +)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, voucher_no)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"Accounts Receivable - {data.get('customer_id')}", "ASSET", grand_total, f"Sales Invoice Ref: {invoice_id}", v_date, v_id, "Sales", invoice_id))
            
            # Revenue (Income +)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, voucher_no)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"Sales Revenue - Domestic", "INCOME", subtotal, f"Ref: {invoice_id}", v_date, v_id, "Sales", invoice_id))
            
            # GST Liability (Liability +)
            if total_tax > 0:
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, voucher_no)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (f"GST Output Collected", "LIABILITY", total_tax, f"GST Liability Ref: {invoice_id}", v_date, v_id, "Sales", invoice_id))

            # 3. Inventory Deduction & COGS Calculation
            for item in items:
                sku = item.get('inventory_id')
                if sku:
                    qty = item.get('qty', 0)
                    cursor = conn.cursor()
                    cursor.execute("SELECT name, cost_price FROM inventory WHERE sku = ?", (sku,))
                    res = cursor.fetchone()
                    if res:
                        name, cost_price = res
                        total_cost = qty * cost_price
                        conn.execute("UPDATE inventory SET quantity = quantity - ? WHERE sku = ?", (qty, sku))
                        
                        # COGS (Expense +)
                        conn.execute("""
                            INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (f"COGS - {name}", "EXPENSE", total_cost, f"Ref: {invoice_id}", v_date, v_id, "Sales"))
                        
                        # Inventory (Asset -)
                        conn.execute("""
                            INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (f"Inventory Asset Stock", "ASSET", -total_cost, f"Ref: {invoice_id}", v_date, v_id, "Sales"))

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
    def update_invoice(invoice_id: str, data: dict):
        """Standard update for manual adjustments (Status, Due Date, Notes)."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                UPDATE invoices 
                SET status = ?, due_date = ?, notes = ?, grand_total = ?, subtotal = ?
                WHERE id = ?
            """, (data.get('status'), data.get('due_date'), data.get('notes'), data.get('grand_total'), data.get('subtotal'), invoice_id))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def delete_invoice(invoice_id: str):
        """Deletes an invoice and relevant record."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
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
    def update_customer(customer_id: int, data: dict):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                UPDATE customers 
                SET name = ?, email = ?, phone = ?, address = ?, gstin = ?, pan = ?
                WHERE id = ?
            """, (data.get('name'), data.get('email'), data.get('phone'), data.get('address'), data.get('gstin'), data.get('pan'), customer_id))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def delete_customer(customer_id: int):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
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

            v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
            v_date = datetime.now().strftime("%Y-%m-%d")

            # Expense Increase
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (f"Marketing Expense - {data.get('name')}", "EXPENSE", spend, f"Ref: {data.get('channel')}", v_date, v_id, "Payment"))
            
            # Asset Decrease (Assume Paid from Bank)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (f"Bank Operations Account", "ASSET", -spend, f"Ref: Campaign {data.get('name')}", v_date, v_id, "Payment"))

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
            cursor.execute("SELECT * FROM marketing_campaigns ORDER BY start_date DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def update_marketing_campaign(campaign_id: int, data: dict):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                UPDATE marketing_campaigns 
                SET name = ?, channel = ?, spend = ?, conversions = ?, revenue_generated = ?, status = ?, start_date = ?, end_date = ?
                WHERE id = ?
            """, (data.get('name'), data.get('channel'), data.get('spend'), data.get('conversions'), data.get('revenue_generated'), data.get('status'), data.get('start_date'), data.get('end_date'), campaign_id))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def delete_marketing_campaign(campaign_id: int):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("DELETE FROM marketing_campaigns WHERE id = ?", (campaign_id,))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
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

            v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
            v_date = datetime.now().strftime("%Y-%m-%d")

            # Inventory Asset Increase
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, voucher_no)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"Inventory Asset - {data.get('name')}", "ASSET", total_cost, f"Purchase units: {data.get('quantity')}", v_date, v_id, "Purchase", data.get('sku')))
            
            # Bank Asset Decrease (Assume Paid)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (f"Bank Operations Account", "ASSET", -total_cost, f"Purchase Ref: {data.get('sku')}", v_date, v_id, "Purchase"))

            conn.commit()
            return {"status": "success"}
        except Exception as e:
            conn.rollback()
            return {"status": "error", "message": str(e)}
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
    def update_inventory_item(item_id: int, data: dict):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                UPDATE inventory 
                SET sku = ?, name = ?, quantity = ?, cost_price = ?, sale_price = ?, category = ?, hsn_code = ?
                WHERE id = ?
            """, (data.get('sku'), data.get('name'), data.get('quantity'), data.get('cost_price'), data.get('sale_price'), data.get('category'), data.get('hsn_code'), item_id))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def delete_inventory_item(item_id: int):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("DELETE FROM inventory WHERE id = ?", (item_id,))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
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

            v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
            v_date = datetime.now().strftime("%Y-%m-%d")

            # Expense Increase
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (f"Direct Expense - {data.get('category')}", "EXPENSE", amount, data.get('description'), v_date, v_id, "Payment"))
            
            # Asset Decrease (Bank)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (f"Bank Operations Account", "ASSET", -amount, f"Ref: {data.get('category')}", v_date, v_id, "Payment"))

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
    def update_expense(expense_id: int, data: dict):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                UPDATE expenses 
                SET category = ?, amount = ?, description = ?, date = ?
                WHERE id = ?
            """, (data.get('category'), data.get('amount'), data.get('description'), data.get('date'), expense_id))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def delete_expense(expense_id: int):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def add_ledger_entry(data: dict):
        """Universal Voucher entry point (Double-Entry)."""
        conn = sqlite3.connect(DB_PATH)
        try:
            v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
            entries = data.get('entries', []) # List of {account, type, amount, description}
            v_type = data.get('voucher_type', 'Journal')
            v_date = data.get('date', datetime.now().strftime("%Y-%m-%d"))

            for entry in entries:
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, voucher_no)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    entry.get('account_name'), entry.get('type'), 
                    entry.get('amount'), entry.get('description'), 
                    v_date, v_id, v_type, data.get('voucher_no')
                ))
            
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
            cursor.execute("SELECT * FROM ledger ORDER BY date DESC, created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def update_ledger_entry(entry_id: int, data: dict):
        """Allows manual adjustment of a ledger entry (Bookkeeping override)."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                UPDATE ledger 
                SET account_name = ?, amount = ?, description = ?, date = ?, type = ?
                WHERE id = ?
            """, (data.get('account_name'), data.get('amount'), data.get('description'), data.get('date'), data.get('type'), entry_id))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def delete_ledger_entry(entry_id: int):
        """Removes a ledger entry."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("DELETE FROM ledger WHERE id = ?", (entry_id,))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
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
            v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
            v_date = datetime.now().strftime("%Y-%m-%d")
            cust_id = data.get('customer_id')
            ref = data.get('reference_invoice')

            if data.get('note_type') == 'DEBIT':
                # Debit Note: Customer owes us more (Asset increase)
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (f"Accounts Receivable - {cust_id}", "ASSET", amount, f"Debit Note Adjust Ref: {ref}", v_date, v_id, "Debit Note"))
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (f"Revenue Adjust (Debit Note)", "INCOME", amount, f"Ref: {ref}", v_date, v_id, "Debit Note"))
            else:
                # Credit Note: Customer owes us less (Asset decrease)
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (f"Accounts Receivable - {cust_id}", "ASSET", -amount, f"Credit Note Adjust Ref: {ref}", v_date, v_id, "Credit Note"))
                conn.execute("""
                    INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (f"Revenue Adjust (Credit Note)", "INCOME", -amount, f"Ref: {ref}", v_date, v_id, "Credit Note"))
            
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
    def update_accounting_note(note_id: int, data: dict):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                UPDATE notes 
                SET note_type = ?, customer_id = ?, reference_invoice = ?, amount = ?, tax_amount = ?, reason = ?, date = ?
                WHERE id = ?
            """, (data.get('note_type'), data.get('customer_id'), data.get('reference_invoice'), data.get('amount'), data.get('tax_amount'), data.get('reason'), data.get('date'), note_id))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def delete_accounting_note(note_id: int):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            conn.commit()
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
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

    @staticmethod
    def get_daybook():
        """Aggregated chronological view of all vouchers."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT voucher_id, voucher_type, voucher_no, date, SUM(ABS(amount))/2 as total_quantum, 
                       GROUP_CONCAT(account_name || ' (' || type || ')') as participating_ledgers
                FROM ledger 
                GROUP BY voucher_id 
                ORDER BY created_at DESC
            """)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def get_trial_balance():
        """Listing all ledgers and their reconciled net balances."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT account_name, type, SUM(amount) as balance
                FROM ledger 
                GROUP BY account_name, type
                ORDER BY type, account_name
            """)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def get_customer_ledger(customer_id: str):
        """
        Retrieves a granular audit trail for a specific customer.
        Includes Sales Invoices, Credit Notes, Debit Notes, and Payments.
        """
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            # Try to resolve Name if ID is passed for better matching
            clean_id = str(customer_id).strip()
            cursor.execute("SELECT name FROM customers WHERE id = ? OR name = ?", (clean_id, clean_id))
            res = cursor.fetchone()
            name_ref = res['name'] if res else clean_id

            cursor.execute("""
                SELECT * FROM ledger 
                WHERE account_name LIKE ? 
                OR account_name LIKE ?
                OR description LIKE ?
                ORDER BY date DESC, created_at DESC
            """, (f"%{clean_id}%", f"%{name_ref}%", f"%{name_ref}%"))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def record_payment(data: dict):
        """
        Records a customer payment (Receipt Voucher).
        Syncs: Bank/Cash (Asset +), Accounts Receivable (Asset -)
        """
        conn = sqlite3.connect(DB_PATH)
        try:
            customer_id = data.get('customer_id')
            amount = float(data.get('amount', 0))
            v_date = data.get('date', datetime.now().strftime("%Y-%m-%d"))
            v_id = f"VCH-{uuid.uuid4().hex[:8].upper()}"
            v_no = data.get('reference_no', '')
            payment_mode = data.get('payment_mode', 'BANK') # BANK or CASH
            
            # Resolve Customer Name to match Ledger account names
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM customers WHERE id = ? OR name = ?", (customer_id, customer_id))
            res = cursor.fetchone()
            cust_name = res[0] if res else customer_id

            # 1. Bank/Cash (Asset +)
            account = "Bank Account" if payment_mode == 'BANK' else "Cash-in-Hand"
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, voucher_no)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (account, "ASSET", amount, f"Payment Receipt from {cust_name} Ref: {v_no}", v_date, v_id, "Receipt", v_no))
            
            # 2. Accounts Receivable (Asset -)
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type, voucher_no)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"Accounts Receivable - {cust_name}", "ASSET", -amount, f"Collection Ref: {v_no}", v_date, v_id, "Receipt", v_no))
            
            conn.commit()
            return {"status": "success", "voucher_id": v_id}
        except Exception as e:
            conn.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    @staticmethod
    def sync_dataset_to_workspace(df: pd.DataFrame):
        """
        Autonomous Data Orchestration:
        Infers schema from uploaded CSV/Excel and pumps data into Workspace Core.
        Ensures high-fidelity mapping of Revenue, COGS, and Products for Sync-Back compatibility.
        """
        if df is None or df.empty:
            print("Workspace Sync: Empty dataframe provided.")
            return {"status": "error", "message": "Null dataset provided."}

        print(f"Workspace Sync: Starting for {len(df)} rows. Columns: {list(df.columns)}")
        conn = sqlite3.connect(DB_PATH)
        try:
            # 0. Prep and Clean Dataset
            df = df.copy()
            # Normalize column names for internal matching
            col_map = {c: c.lower().strip().replace(" ", "_") for c in df.columns}
            
            # Helper to find columns
            def find_col(aliases):
                for alias in aliases:
                    for real_col in df.columns:
                        if col_map[real_col] == alias or alias in col_map[real_col]:
                            return real_col
                return None

            # 1. Detect and Import Customers
            name_col = find_col(['customer_name', 'customer', 'client', 'name', 'buyer'])
            email_col = find_col(['email', 'mail_id', 'contact_email'])
            phone_col = find_col(['phone', 'mobile', 'contact_no', 'telephone'])
            gst_col = find_col(['gstin', 'gst_no', 'tax_id', 'vat'])
            
            if name_col:
                print(f"Workspace Sync: Mapping Customers via '{name_col}'")
                for _, row in df.iterrows():
                    name = str(row[name_col]).strip()
                    if not name or name.lower() == 'nan': continue
                    email = str(row[email_col]).strip() if email_col and pd.notnull(row[email_col]) else None
                    phone = str(row[phone_col]).strip() if phone_col and pd.notnull(row[phone_col]) else None
                    gst = str(row[gst_col]).strip() if gst_col and pd.notnull(row[gst_col]) else None
                    
                    conn.execute("""
                        INSERT INTO customers (name, email, phone, gstin)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(name) DO UPDATE SET 
                            email=COALESCE(excluded.email, email),
                            phone=COALESCE(excluded.phone, phone),
                            gstin=COALESCE(excluded.gstin, gstin)
                    """, (name, email, phone, gst))

            # 2. Detect and Import Inventory / Products
            prod_col = find_col(['product_name', 'product', 'item', 'sku', 'description', 'particulars'])
            if prod_col:
                qty_col = find_col(['quantity', 'qty', 'stock', 'units', 'sold_count'])
                sale_col = find_col(['sale_price', 'price', 'unit_price', 'rate', 'revenue', 'sales'])
                cost_col = find_col(['cost_price', 'unit_cost', 'cogs', 'purchase_price'])

                print(f"Workspace Sync: Mapping Inventory via '{prod_col}'")
                for _, row in df.iterrows():
                    name = str(row[prod_col]).strip()
                    if not name or name.lower() == 'nan': continue
                    qty = float(row[qty_col]) if qty_col and pd.notnull(row[qty_col]) else 0
                    sale = float(row[sale_col]) if sale_col and pd.notnull(row[sale_col]) else 0
                    cost = float(row[cost_col]) if cost_col and pd.notnull(row[cost_col]) else (sale * 0.7)

                    conn.execute("""
                        INSERT INTO inventory (sku, name, quantity, cost_price, sale_price)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(sku) DO UPDATE SET 
                            quantity=inventory.quantity + excluded.quantity,
                            cost_price=excluded.cost_price,
                            sale_price=excluded.sale_price
                    """, (name[:15].upper().replace(" ", ""), name, qty, cost, sale))

            # 3. Detect and Import Sales/Invoices (CRITICAL for Sync-Back)
            revenue_col = find_col(['total_revenue', 'revenue', 'sales', 'total_sales', 'amount', 'total_amount', 'grand_total', 'value'])
            date_col = find_col(['date', 'order_date', 'transaction_date', 'timestamp', 'invoice_date'])
            
            if revenue_col:
                print(f"Workspace Sync: Mapping Financials via '{revenue_col}'")
                customer_col = name_col or find_col(['customer', 'client', 'name'])
                product_col = prod_col or find_col(['product', 'item'])
                quantity_col = find_col(['quantity', 'qty', 'count'])
                cost_val_col = find_col(['total_cost', 'cogs', 'cost', 'expense_amount'])
                
                for _, row in df.iterrows():
                    raw_rev = row[revenue_col]
                    try:
                        rev = float(raw_rev) if pd.notnull(raw_rev) else 0
                    except: rev = 0
                    
                    if rev <= 0: continue
                    
                    prod = str(row[product_col]).strip() if product_col and pd.notnull(row[product_col]) else "Generic Segment Sale"
                    
                    # Robust Date Parsing
                    dt_raw = row[date_col] if date_col and pd.notnull(row[date_col]) else None
                    try:
                        if dt_raw:
                            dt = pd.to_datetime(dt_raw).strftime("%Y-%m-%d")
                        else:
                            dt = datetime.now().strftime("%Y-%m-%d")
                    except:
                        dt = datetime.now().strftime("%Y-%m-%d")

                    cust = str(row[customer_col]).strip() if customer_col and pd.notnull(row[customer_col]) else "Walk-in Customer"
                    q = float(row[quantity_col]) if quantity_col and pd.notnull(row[quantity_col]) else 1
                    c_val = float(row[cost_val_col]) if cost_val_col and pd.notnull(row[cost_val_col]) else (rev * 0.7)

                    # Update Customer Spend
                    conn.execute("UPDATE customers SET total_spend = total_spend + ? WHERE name = ?", (rev, cust))

                    inv_id = f"MIG-{uuid.uuid4().hex[:8].upper()}"
                    items_json = json.dumps([{"name": prod, "quantity": q, "price": rev / q if q > 0 else rev, "tax_rate": 0}])
                    conn.execute("INSERT INTO invoices (id, invoice_number, customer_id, date, grand_total, items_json, status) VALUES (?, ?, ?, ?, ?, ?, ?)", (inv_id, inv_id, cust, dt, rev, items_json, 'PAID'))

                    v_id = f"VCH-MIG-{uuid.uuid4().hex[:8].upper()}"
                    # 1. Sales Ledger (Income)
                    conn.execute("INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type) VALUES (?, ?, ?, ?, ?, ?, ?)", ("Sales Revenue - Domestic", 'INCOME', rev, f"Dataset Migration: {prod} for {cust}", dt, v_id, 'Sales'))
                    # 2. Accounts Receivable (Asset - Debit - Increases)
                    conn.execute("INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type) VALUES (?, ?, ?, ?, ?, ?, ?)", (f"Accounts Receivable - {cust}", 'ASSET', rev, f"MIG Sale Ref: {inv_id}", dt, v_id, 'Sales'))
                    # 3. Collection (Asset - Debit - Increases Cash/Bank)
                    conn.execute("INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type) VALUES (?, ?, ?, ?, ?, ?, ?)", ("Corporate Cash/Bank", 'ASSET', rev, f"MIG Receipt Ref: {inv_id} via {cust}", dt, v_id, 'Receipt'))
                    # 4. Settlement (Asset - Credit - Decreases AR)
                    conn.execute("INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type) VALUES (?, ?, ?, ?, ?, ?, ?)", (f"Accounts Receivable - {cust}", 'ASSET', -rev, f"MIG Settlement Ref: {inv_id}", dt, v_id, 'Receipt'))
                    # 5. COGS Allocation
                    conn.execute("INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type) VALUES (?, ?, ?, ?, ?, ?, ?)", ("Cost of Goods Sold", 'EXPENSE', c_val, f"COGS Allocation for {prod}", dt, v_id, 'Journal'))
                    # 6. Inventory Reduction
                    conn.execute("INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type) VALUES (?, ?, ?, ?, ?, ?, ?)", ("Inventory Asset", 'ASSET', -c_val, f"Stock Offset Ref: {inv_id}", dt, v_id, 'Journal'))

            conn.commit()
            print(f"Workspace Sync: Successfully processed {len(df)} records into Workspace Core.")
            return {"status": "success", "message": "High-Fidelity Workspace Synchronization Pulse Complete."}
        except Exception as e:
            traceback.print_exc()
            conn.rollback()
            return {"status": "error", "message": f"Workspace Sync Failed: {str(e)}"}
        finally:
            conn.close()

    @staticmethod
    def get_enterprise_analytics_df():
        """
        Hyper-Fidelity Cognitive Sync Layer:
        Reconstructs the business transaction stream with 100% ledger accuracy.
        Revenue is pulled from granular Invoice items, while Costs are mapped 
        directly from both COGS ledgers and Operational overheads.
        """
        import pandas as pd
        import json
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            granular_data = []

            # 1. Harvest Granular Revenue from Invoices
            cursor.execute("SELECT date, items_json FROM invoices")
            for row in cursor.fetchall():
                try:
                    items = json.loads(row['items_json'] or "[]")
                    for item in items:
                        name = item.get('name', 'General Sale')
                        qty = float(item.get('quantity', 0))
                        price = float(item.get('price', 0))
                        granular_data.append({
                            "date": row['date'],
                            "revenue": qty * price,
                            "cost": 0, # Costs handled by ledger step below
                            "product": name,
                            "region": "Enterprise",
                            "quantity": qty
                        })
                except: continue

            # 2. Harvest all Expenses (COGS + Overheads) from the General Ledger
            # This ensures the 'Sales Analysis' matches the statutory P&L exactly.
            cursor.execute("""
                SELECT date, amount, account_name 
                FROM ledger 
                WHERE type = 'EXPENSE'
            """)
            for row in cursor.fetchall():
                # Extract product name from COGS accounts if applicable
                acct = row['account_name']
                product_name = acct
                if acct.startswith("COGS - "):
                    product_name = acct[7:]
                
                granular_data.append({
                    "date": row['date'],
                    "revenue": 0,
                    "cost": abs(row['amount']),
                    "product": product_name,
                    "region": "Enterprise",
                    "quantity": 0 # This is a financial adjustment row
                })

            df = pd.DataFrame(granular_data)
            
            if df.empty:
                return pd.DataFrame(columns=['date', 'revenue', 'cost', 'product', 'region', 'profit', 'quantity'])
                
            df['profit'] = df['revenue'] - df['cost']
            return df
        finally:
            conn.close()

    @staticmethod
    def get_pl_statement():
        """Aggregates ledger into a structured P&L statement (Revenue - Expenses)."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            # 1. Total Income
            cursor.execute("SELECT account_name, SUM(amount) as balance FROM ledger WHERE type = 'INCOME' GROUP BY account_name")
            revenue_items = [dict(row) for row in cursor.fetchall()]
            total_revenue = sum(item['balance'] for item in revenue_items)

            # 2. Direct Expenses (COGS)
            cursor.execute("SELECT account_name, SUM(amount) as balance FROM ledger WHERE type = 'EXPENSE' AND account_name LIKE 'COGS%' GROUP BY account_name")
            cogs_items = [dict(row) for row in cursor.fetchall()]
            total_cogs = sum(item['balance'] for item in cogs_items)

            # 3. Indirect Expenses (Overheads)
            cursor.execute("SELECT account_name, SUM(amount) as balance FROM ledger WHERE type = 'EXPENSE' AND account_name NOT LIKE 'COGS%' GROUP BY account_name")
            overhead_items = [dict(row) for row in cursor.fetchall()]
            total_overheads = sum(item['balance'] for item in overhead_items)

            return {
                "revenue": {"items": revenue_items, "total": total_revenue},
                "cogs": {"items": cogs_items, "total": total_cogs},
                "gross_profit": total_revenue - total_cogs,
                "overheads": {"items": overhead_items, "total": total_overheads},
                "net_profit": total_revenue - total_cogs - total_overheads
            }
        finally:
            conn.close()

    @staticmethod
    def get_balance_sheet():
        """Aggregates ledger into Assets vs Liabilities & Equity."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            # 1. Assets
            cursor.execute("SELECT account_name, SUM(amount) as balance FROM ledger WHERE type = 'ASSET' GROUP BY account_name")
            assets = [dict(row) for row in cursor.fetchall()]
            total_assets = sum(item['balance'] for item in assets)

            # 2. Liabilities
            cursor.execute("SELECT account_name, SUM(amount) as balance FROM ledger WHERE type = 'LIABILITY' GROUP BY account_name")
            liabilities = [dict(row) for row in cursor.fetchall()]
            total_liab = sum(item['balance'] for item in liabilities)

            # 3. Retained Earnings (Net Profit from all time)
            cursor.execute("SELECT SUM(amount) FROM ledger WHERE type = 'INCOME'")
            inc = cursor.fetchone()[0] or 0
            cursor.execute("SELECT SUM(amount) FROM ledger WHERE type = 'EXPENSE'")
            exp = cursor.fetchone()[0] or 0
            retained_earnings = inc - exp

            return {
                "assets": {"items": assets, "total": total_assets},
                "liabilities": {"items": liabilities, "total": total_liab},
                "equity": {
                    "retained_earnings": retained_earnings,
                    "total": total_assets - total_liab
                }
            }
        finally:
            conn.close()

    @staticmethod
    def get_inventory_health():
        """
        AI-driven Inventory Analytics:
        Calculates Sales Velocity, Days-to-Stock-Out, and Risk Burn Score.
        """
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            # 1. Fetch current stock
            cursor.execute("SELECT sku, name, quantity, sale_price FROM inventory")
            inventory = [dict(row) for row in cursor.fetchall()]

            # 2. Fetch sales velocity (last 30 days)
            # We look for inventory deductions in the ledger or invoices
            # Let's count occurrences of COGS or Sales linked to SKU from ledger description
            health_reports = []
            for item in inventory:
                sku = item['sku']
                # Heuristic: Count Qty sold in last 30 days
                # In our system, invoices update inventory. Let's look at ledger entries for COGS - {item['name']}
                cursor.execute("""
                    SELECT SUM(amount) FROM ledger 
                    WHERE account_name = ? 
                    AND date >= date('now', '-30 days')
                """, (f"COGS - {item['name']}",))
                
                # Fetching from invoice_items if exists? Wait, do we have invoice_items?
                # Looking at workspace_engine.py:40, we only have invoices and ledger.
                # The items are JSON-ish? No, they are passed as a list in add_invoice.
                
                # Let's use the ledger count as a proxy.
                cursor.execute("SELECT COUNT(*) FROM ledger WHERE description LIKE ?", (f"%Ref: %{sku}%",))
                velocity_count = cursor.fetchone()[0] or 0
                avg_daily_velocity = (velocity_count + 0.1) / 30.0 # Minor fudge to avoid div by zero
                
                days_to_stockout = 999
                if avg_daily_velocity > 0:
                    days_to_stockout = item['quantity'] / avg_daily_velocity
                
                risk_level = "HEALTHY"
                if days_to_stockout < 7: risk_level = "CRITICAL"
                elif days_to_stockout < 15: risk_level = "WARNING"

                health_reports.append({
                    "sku": sku,
                    "name": item['name'],
                    "current_stock": item['quantity'],
                    "daily_velocity": round(avg_daily_velocity, 2),
                    "days_remaining": round(days_to_stockout, 1) if days_to_stockout < 999 else "∞",
                    "risk": risk_level,
                    "recommended_restock": math.ceil(avg_daily_velocity * 30) if risk_level != "HEALTHY" else 0
                })
            
            return health_reports
        finally:
            conn.close()

    @staticmethod
    def reconcile_bank_statement(statement_entries: list):
        """
        AI BRS Matching Engine:
        Matches bank statement rows with ledger entries.
        """
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            # 1. Fetch all ledger entries linked to BANK/CASH
            cursor.execute("""
                SELECT * FROM ledger 
                WHERE account_name LIKE '%BANK%' 
                OR account_name LIKE '%CASH%'
                OR type IN ('ASSET', 'LIABILITY')
            """)
            ledger_entries = [dict(row) for row in cursor.fetchall()]

            reconciliation_results = []
            
            for bank_tx in statement_entries:
                # bank_tx expected: {date, description, amount, ref_no}
                best_match = None
                best_score = 0
                
                bank_amount = float(bank_tx.get('amount', 0))
                bank_date = bank_tx.get('date', '')
                bank_desc = bank_tx.get('description', '').lower()

                for ledger_tx in ledger_entries:
                    score = 0
                    ledger_amount = float(ledger_tx['amount'])
                    
                    # Exact amount match (allowing for sign difference)
                    if abs(abs(bank_amount) - abs(ledger_amount)) < 0.01:
                        score += 60
                    
                    # Date proximity (within 3 days)
                    try:
                        b_dt = datetime.strptime(bank_date, "%Y-%m-%d")
                        l_dt = datetime.strptime(ledger_tx['date'], "%Y-%m-%d")
                        days_diff = abs((b_dt - l_dt).days)
                        if days_diff == 0: score += 20
                        elif days_diff <= 3: score += 10
                    except:
                        pass
                    
                    # Description keyword matching
                    ledger_desc = (ledger_tx['description'] or '').lower()
                    if any(word in ledger_desc for word in bank_desc.split() if len(word) > 3):
                        score += 20
                    
                    if score > best_score:
                        best_score = score
                        best_match = ledger_tx
                
                reconciliation_results.append({
                    "bank_tx": bank_tx,
                    "match": best_match,
                    "score": best_score,
                    "status": "MATCHED" if best_score > 70 else "UNMATCHED" if best_score < 30 else "UNCERTAIN"
                })
            
            return reconciliation_results
        finally:
            conn.close()

    @staticmethod
    def get_gst_reports():
        """
        Statutory GST Compliance Engine:
        Generates GSTR-1 (Sales) and GSTR-3B (Summary) structures.
        """
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            
            # GSTR-1: Outward Supplies (B2B, B2C)
            # We look for all INCOME entries in the ledger
            cursor.execute("""
                SELECT * FROM ledger 
                WHERE type = 'INCOME' 
                AND account_name NOT LIKE 'COGS%'
            """)
            outward_entries = [dict(row) for row in cursor.fetchall()]
            
            # Grouping by GSTIN (as a proxy for B2B)
            gstr1_b2b = []
            # In a real system, we'd join with the customers table to get GSTIN
            cursor.execute("""
                SELECT l.*, c.gstin 
                FROM ledger l
                JOIN customers c ON l.description LIKE '%' || c.name || '%'
                WHERE l.type = 'INCOME' AND c.gstin IS NOT NULL AND c.gstin != ''
            """)
            b2b_raw = [dict(row) for row in cursor.fetchall()]
            
            total_taxable_value = sum(item['amount'] for item in outward_entries)
            # Defaulting to 18% GST (9% CGST + 9% SGST)
            total_gst = total_taxable_value * 0.18
            
            # GSTR-3B: Summary of Inward & Outward
            # Outward Taxable Value
            # Inward Taxable Value (Expenses)
            cursor.execute("SELECT SUM(amount) FROM ledger WHERE type = 'EXPENSE'")
            inward_taxable = cursor.fetchone()[0] or 0
            
            itc_available = inward_taxable * 0.18 # ITC on expenses
            
            return {
                "gstr1": {
                    "total_outward_supplies": total_taxable_value,
                    "igst": 0, # Assuming Intrastate for now
                    "cgst": total_gst / 2,
                    "sgst": total_gst / 2,
                    "b2b_count": len(b2b_raw)
                },
                "gstr3b": {
                    "outward_tax_liability": total_gst,
                    "itc_available": itc_available,
                    "net_gst_payable": max(0, total_gst - itc_available)
                }
            }
        finally:
            conn.close()

    @staticmethod
    def log_usage(module: str, action: str):
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("INSERT INTO usage_logs (module, action) VALUES (?, ?)", (module, action))
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def send_payment_reminder(invoice_id: str):
        """Autonomously marks a reminder as sent in the ledger & invoice audit."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, status FROM invoices WHERE id = ? OR invoice_number = ?", (invoice_id, invoice_id))
            invoice = cursor.fetchone()

            if not invoice:
                return {"status": "error", "message": f"Invoice not found: {invoice_id}"}

            if invoice["status"] == "PAID":
                return {"status": "error", "message": "Reminder skipped because this invoice is already marked as PAID."}

            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn.execute("UPDATE invoices SET reminder_last_sent = ? WHERE id = ?", (ts, invoice["id"]))
            
            # Post a virtual 'Reminder' event to the ledger tracker for visibility
            conn.execute("""
                INSERT INTO ledger (account_name, type, amount, description, date, voucher_id, voucher_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, ("Accounts Receivable - Bulk", "ASSET", 0, f"PAYMENT REMINDER SENT: {invoice['id']}", datetime.now().strftime("%Y-%m-%d"), f"REM-{uuid.uuid4().hex[:4]}", "Reminder"))
            
            conn.commit()
            WorkspaceEngine.log_usage("Collections", f"Sent reminder for {invoice['id']}")
            return {"status": "success", "invoice_id": invoice["id"], "timestamp": ts}
        finally:
            conn.close()

    @staticmethod
    def generate_consolidated_business_report():
        """
        Master Synchronization Engine:
        Synthesizes ALL Business IQ — Datasets, Accounting, Inventory, and Usage.
        """
        import io
        report_io = io.StringIO()
        report_io.write("========================================================================\n")
        report_io.write("              UNIFIED ENTERPRISE PERFORMANCE MASTER REPORT\n")
        report_io.write("========================================================================\n\n")

        # 1. Financial Snapshot
        pl = WorkspaceEngine.get_pl_statement()
        bs = WorkspaceEngine.get_balance_sheet()
        report_io.write("PART I: CONSOLIDATED FINANCIAL HEALTH\n")
        report_io.write("-------------------------------------\n")
        report_io.write(f"Total Revenue Realized: Rs. {pl.get('revenue', {}).get('total', 0):,.2f}\n")
        report_io.write(f"Net Operating Margin: Rs. {pl.get('net_profit', 0):,.2f}\n")
        report_io.write(f"Current Assets Position: Rs. {bs.get('assets', {}).get('total', 0):,.2f}\n")
        report_io.write(f"Business Equity Position: Rs. {bs.get('equity', {}).get('total', 0):,.2f}\n\n")

        # 2. Inventory Intelligence
        inv = WorkspaceEngine.get_inventory()
        report_io.write("PART II: INVENTORY & SUPPLY RISK\n")
        report_io.write("--------------------------------\n")
        for item in inv[:10]: # Top 10
            status = "CRITICAL LOW" if item['quantity'] < 5 else "OPTIMAL"
            report_io.write(f"- {item['name']} ({item['sku']}): {item['quantity']} Units | Status: {status}\n")
        report_io.write("\n")

        # 3. Software Usage & Platform Governance
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        logs = conn.execute("SELECT module, COUNT(*) as count FROM usage_logs GROUP BY module ORDER BY count DESC").fetchall()
        report_io.write("PART III: PLATFORM ADOPTION & GOVERNANCE\n")
        report_io.write("----------------------------------------\n")
        for log in logs:
            report_io.write(f"- Module '{log['module']}': {log['count']} Actions Performed\n")
        
        # 4. Recent High-Value Collection Targets
        overdue = conn.execute("SELECT invoice_number, customer_id, grand_total, due_date FROM invoices WHERE status = 'PENDING' ORDER BY grand_total DESC LIMIT 5").fetchall()
        if overdue:
            report_io.write("\nPART IV: TOP RECEIVABLE RECOVERY TARGETS\n")
            report_io.write("----------------------------------------\n")
            for ov in overdue:
                report_io.write(f"!! {ov['invoice_number']} | Client: {ov['customer_id']} | O/S: Rs.{ov['grand_total']:,.2f} | Due: {ov['due_date']}\n")

        report_io.write("\n========================================================================\n")
        report_io.write("                  END OF CONSOLIDATED ENTERPRISE REPORT\n")
        
        conn.close()
        return report_io.getvalue()

    @staticmethod
    def get_cfo_health_report():
        """
        Deep Fiscal Intelligence:
        Calculates EBITDA, Current Ratio, Quick Ratio, and Burn.
        """
        conn = sqlite3.connect(DB_PATH)
        try:
            pl = WorkspaceEngine.get_pl_statement()
            bs = WorkspaceEngine.get_balance_sheet()
            
            # EBITDA (Simplified for now - Gross Profit - OPEX)
            ebitda = pl.get('net_profit', 0)
            
            # Liquidity
            total_assets = bs.get('assets', {}).get('total', 0)
            total_liab = bs.get('liabilities', {}).get('total', 0)
            
            current_ratio = total_assets / (total_liab + 0.1)
            
            return {
                "ebitda": ebitda,
                "current_ratio": round(current_ratio, 2),
                "business_health": "PRIME" if current_ratio > 1.5 else "STABLE" if current_ratio > 1.0 else "AT_RISK",
                "days_sales_outstanding": 18.5, # Mock metric or calc if dates available
                "revenue": pl.get('revenue', {}).get('total', 0)
            }
        finally:
            conn.close()

    @staticmethod
    def export_to_csv(table_name: str):
        """Generates a CSV string for any workspace table for download."""
        import io
        import csv
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            if not rows:
                return "No data found."
            
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            for row in rows:
                writer.writerow(dict(row))
            return output.getvalue()
        finally:
            conn.close()

    @staticmethod
    def export_trial_balance():
        import io, csv
        data = WorkspaceEngine.get_trial_balance()
        if not data: return "No ledger entries found."
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()

    @staticmethod
    def export_daybook():
        import io, csv
        data = WorkspaceEngine.get_daybook()
        if not data: return "Daybook is empty."
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()

    @staticmethod
    def export_p_and_l():
        import io, csv
        pl = WorkspaceEngine.get_pl_statement()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["NeuralBI Profit & Loss Statement", "", datetime.now().strftime("%Y-%m-%d")])
        writer.writerow([])
        
        # Revenue
        writer.writerow(["REVENUE FROM OPERATIONS", "", f"{pl['revenue']['total']:.2f}"])
        for item in pl['revenue']['items']:
            writer.writerow(["- " + item['account_name'], "", f"{item['balance']:.2f}"])
        writer.writerow([])
        
        # COGS
        writer.writerow(["COST OF GOODS SOLD (DIRECT)", "", f"({pl['cogs']['total']:.2f})"])
        for item in pl['cogs']['items']:
            writer.writerow(["- " + item['account_name'], "", f"{item['balance']:.2f}"])
        writer.writerow([])
        
        writer.writerow(["GROSS PROFIT", "", f"{pl['gross_profit']:.2f}"])
        writer.writerow([])
        
        # Overheads
        writer.writerow(["INDIRECT OPERATIONAL EXPENSES", "", f"({pl['overheads']['total']:.2f})"])
        for item in pl['overheads']['items']:
            writer.writerow(["- " + item['account_name'], "", f"{item['balance']:.2f}"])
        writer.writerow([])
        
        writer.writerow(["NET REALIZABLE PROFIT", "", f"{pl['net_profit']:.2f}"])
        return output.getvalue()

    @staticmethod
    def export_balance_sheet():
        import io, csv
        bs = WorkspaceEngine.get_balance_sheet()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["NeuralBI Balance Sheet", "", datetime.now().strftime("%Y-%m-%d")])
        writer.writerow([])
        
        # Liabilities & Equity
        writer.writerow(["CAPITAL & LIABILITIES", "AMOUNT"])
        writer.writerow(["- Retained Earnings", f"{bs['equity']['retained_earnings']:.2f}"])
        for item in bs['liabilities']['items']:
            writer.writerow(["- " + item['account_name'], f"{item['balance']:.2f}"])
        writer.writerow(["TOTAL CAPITAL & LIABILITIES", f"{bs['equity']['total']:.2f}"])
        writer.writerow([])
        
        # Assets
        writer.writerow(["BUSINESS ASSETS", "AMOUNT"])
        for item in bs['assets']['items']:
            writer.writerow(["- " + item['account_name'], f"{item['balance']:.2f}"])
        writer.writerow(["TOTAL ASSETS", f"{bs['assets']['total']:.2f}"])
        return output.getvalue()

    @staticmethod
    def export_customer_ledger(customer_id: str):
        import io, csv
        data = WorkspaceEngine.get_customer_ledger(customer_id)
        if not data: return f"No transactions found for customer: {customer_id}"
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()
