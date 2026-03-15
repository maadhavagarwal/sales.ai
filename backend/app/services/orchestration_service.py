
import pandas as pd
import json
import uuid
import sqlite3
from datetime import datetime
from app.core.database_manager import DB_PATH, get_db_connection

class OrchestrationService:
    @staticmethod
    def identify_and_map(df: pd.DataFrame):
        """
        Heuristic-based classification of CSV contents.
        Returns (table_name, mapped_df)
        """
        cols = [str(c).lower() for c in df.columns]
        
        # 1. Personnel / Employees
        if any(kw in cols for kw in ['salary', 'designation', 'employee', 'staff', 'role']):
            # Mapping logic
            mapping = {
                'name': ['name', 'full name', 'employee name', 'staff name'],
                'email': ['email', 'email address', 'official email'],
                'role': ['role', 'designation', 'position', 'job title'],
                'id': ['id', 'emp id', 'staff id', 'personnel id']
            }
            return 'personnel', OrchestrationService._apply_mapping(df, mapping, prefix="STAFF-")

        # 2. Invoices
        if any(kw in cols for kw in ['invoice', 'bill no', 'voucher no', 'irn']):
            mapping = {
                'invoice_number': ['invoice', 'invoice no', 'bill no', 'voucher no'],
                'date': ['date', 'invoice date', 'bill date'],
                'customer_id': ['customer', 'party', 'client', 'buyer'],
                'grand_total': ['total', 'amount', 'grand total', 'net amount'],
                'status': ['status', 'payment status']
            }
            return 'invoices', OrchestrationService._apply_mapping(df, mapping, prefix="INV-")

        # 3. Inventory / Stock
        if any(kw in cols for kw in ['sku', 'stock', 'quantity', 'qty', 'warehouse']):
            mapping = {
                'sku': ['sku', 'code', 'part no', 'item code'],
                'name': ['name', 'item', 'product', 'description'],
                'quantity': ['qty', 'quantity', 'stock', 'available'],
                'sale_price': ['price', 'sale price', 'rate', 'unit price'],
                'cost_price': ['cost', 'cost price', 'purchase price']
            }
            return 'inventory', OrchestrationService._apply_mapping(df, mapping)

        # 4. Customers
        if any(kw in cols for kw in ['customer', 'address', 'gstin', 'pan']):
            mapping = {
                'name': ['name', 'customer name', 'party name', 'client'],
                'email': ['email', 'contact email'],
                'phone': ['phone', 'mobile', 'contact'],
                'gstin': ['gstin', 'gst', 'tax id']
            }
            return 'customers', OrchestrationService._apply_mapping(df, mapping)

        # 5. Ledger / Finance
        if any(kw in cols for kw in ['ledger', 'account', 'debit', 'credit', 'voucher']):
            mapping = {
                'account_name': ['account', 'ledger', 'head'],
                'amount': ['amount', 'value', 'net'],
                'date': ['date', 'txn date'],
                'type': ['type', 'category']
            }
            return 'ledger', OrchestrationService._apply_mapping(df, mapping)

        return 'unsupported', df

    @staticmethod
    def _apply_mapping(df, mapping, prefix=""):
        """Simple fuzzy mapping of columns to schema."""
        new_df = pd.DataFrame()
        cols = [str(c).lower() for c in df.columns]
        
        for schema_col, keywords in mapping.items():
            found = False
            for kw in keywords:
                if kw in cols:
                    # Find original col name (case may differ)
                    orig_col = df.columns[cols.index(kw)]
                    new_df[schema_col] = df[orig_col]
                    found = True
                    break
            if not found:
                new_df[schema_col] = None
        
        # Post-processing: Generate IDs if missing
        if 'id' in new_df.columns and new_df['id'].isnull().all():
            new_df['id'] = [f"{prefix}{uuid.uuid4().hex[:6].upper()}" for _ in range(len(new_df))]
        elif 'id' not in new_df.columns:
            new_df['id'] = [f"{prefix}{uuid.uuid4().hex[:6].upper()}" for _ in range(len(new_df))]
            
        return new_df

    @staticmethod
    def process_and_save(files_data):
        """
        Processes multiple DataFrames, identifies them, and saves to DB.
        """
        results = []
        conn, db_type = get_db_connection()
        try:
            for filename, df in files_data:
                table, mapped_df = OrchestrationService.identify_and_map(df)
                if table != 'unsupported' and not mapped_df.empty:
                    # Use replace to be "Human made type" (refresh data if reuploaded)
                    # Actually user said "no reuploads", meaning they persist.
                    # But if they upload new file, we should probably append or merge.
                    # For bulk initial, we'll append.
                    mapped_df.to_sql(table, conn, if_exists='append', index=False)
                    results.append({"file": filename, "found_type": table, "records": len(mapped_df)})
                else:
                    results.append({"file": filename, "found_type": "UNKNOWN", "records": 0})
            conn.commit()
        except Exception as e:
            print(f"Orchestration Error: {e}")
            raise e
        finally:
            conn.close()
        return results

orchestration_service = OrchestrationService()
