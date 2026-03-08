import sqlite3
import os
import pandas as pd
import json

# Define a shared database location in the 'data' directory
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "business_data.db")

def init_workspace_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        # User management table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Invoicing Table (Indian GST Standards - CGST, SGST, IGST)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                invoice_number TEXT UNIQUE,
                customer_id TEXT,
                customer_gstin TEXT,
                customer_pan TEXT,
                date TEXT,
                due_date TEXT,
                items_json TEXT,  -- {desc, qty, price, hsn, tax_rate, cgst, sgst, igst}
                subtotal REAL,
                total_tax REAL,
                cgst_total REAL,
                sgst_total REAL,
                igst_total REAL,
                grand_total REAL,
                status TEXT DEFAULT 'PENDING',
                notes TEXT,
                currency TEXT DEFAULT '₹',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Customer CRM Table (Extended for Business Compliance)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                gstin TEXT,  -- Indian Tax ID
                pan TEXT,    -- Permanent Account Number
                total_spend REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Marketing Campaigns (Acquisition & ROI tracking)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                channel TEXT,  -- Meta, Google, LinkedIn, Email
                spend REAL,
                conversions INTEGER,
                revenue_generated REAL,
                status TEXT DEFAULT 'ACTIVE',
                start_date TEXT,
                end_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Inventory Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT UNIQUE,
                name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                cost_price REAL,
                sale_price REAL,
                category TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Expense Tracking
        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT,
                amount REAL,
                description TEXT,
                receipt_url TEXT,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Accounting Ledger (General Ledger)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_name TEXT NOT NULL,
                type TEXT, -- INCOME, EXPENSE, ASSET, LIABILITY
                amount REAL,
                description TEXT,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Debit and Credit Notes (Statutory corrections)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_type TEXT, -- DEBIT, CREDIT
                customer_id TEXT,
                reference_invoice TEXT,
                amount REAL,
                tax_amount REAL,
                reason TEXT,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Ensure missing columns exist in customers table (Indian statutory updates)
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN gstin TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN pan TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN phone TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN total_spend REAL DEFAULT 0.0")
        except sqlite3.OperationalError: pass

        # Ensure missing columns exist in inventory (Statutory update)
        try:
            conn.execute("ALTER TABLE inventory ADD COLUMN hsn_code TEXT")
        except sqlite3.OperationalError: pass

        # Ensure missing columns exist in invoices table (Statutory Billing Update)
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN invoice_number TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN customer_gstin TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN customer_pan TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN due_date TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN cgst_total REAL DEFAULT 0.0")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN sgst_total REAL DEFAULT 0.0")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN igst_total REAL DEFAULT 0.0")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN total_tax REAL DEFAULT 0.0")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT '₹'")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN notes TEXT")
        except sqlite3.OperationalError: pass

        conn.commit()
    finally:
        conn.close()

# Auto-initialize on import
init_workspace_db()

def store_data(dataset_id, df):
    """
    Persistently stores the dataframe into the business_data.db SQLite backend.
    """
    if df is None or df.empty:
        return

    # Create directory if missing
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Simple normalization for SQL column headers
    df = df.copy()
    df.columns = [str(c).replace(" ", "_").replace(".", "_").lower() for c in df.columns]
    
    # Tagging all rows
    df['_enterprise_session_uuid'] = dataset_id

    try:
        conn = sqlite3.connect(DB_PATH)
        df.to_sql("enterprise_transactions", conn, if_exists="append", index=False)
        conn.close()
    except Exception as e:
        print(f"SQL Storage Error: {e}")

# --- USER MANAGEMENT ---
def init_auth_db():
    # Deprecated: Combined into init_workspace_db
    init_workspace_db()

def create_user_record(email, password_hash):
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, password_hash))
        conn.commit()
        return True
    except Exception:
        return False
    finally:
        conn.close()

def get_user_record(email):
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT email, password_hash FROM users WHERE email = ?", (email,))
        return cursor.fetchone()
    finally:
        conn.close()

def get_session_data_sql(dataset_id):
    """
    Retrieves only the rows belonging to a specific session from the SQL store.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        query = f"SELECT * FROM enterprise_transactions WHERE _enterprise_session_uuid = '{dataset_id}'"
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    except Exception:
        return None
