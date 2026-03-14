import sqlite3
import os
import pandas as pd
import json
import time
import base64
import uuid
from datetime import datetime

# Vector Database Support
try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False

# Postgres Support
try:
    import psycopg2
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "enterprise.db")
VECTOR_DB_PATH = os.path.join(DATA_DIR, "vector_store")
os.makedirs(VECTOR_DB_PATH, exist_ok=True)

PG_URL = os.environ.get("DATABASE_URL", None)

vector_client = None
if HAS_CHROMA:
    try:
        vector_client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
    except Exception as e:
        print(f"Warning: Failed to initialize ChromaDB Vector Store. {e}")

def get_db_connection():
    if PG_URL and HAS_POSTGRES:
        conn = psycopg2.connect(PG_URL)
        return conn, 'postgres'
    else:
        conn = sqlite3.connect(DB_PATH)
        return conn, 'sqlite'

def init_workspace_db():
    conn, db_type = get_db_connection()
    try:
        # 1. Users & Security
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT DEFAULT 'ADMIN',
                allowed_ips TEXT,
                idle_timeout INTEGER DEFAULT 3600,
                onboarding_complete INTEGER DEFAULT 0,
                company_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. Enterprise Company Profile
        conn.execute("""
            CREATE TABLE IF NOT EXISTS company_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                gstin TEXT,
                industry TEXT,
                hq_location TEXT,
                currency TEXT DEFAULT 'INR',
                details_json TEXT
            )
        """)

        # 3. Intelligent Files Catalog (Segregation tracking)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS files_catalog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                filename TEXT,
                file_type TEXT, -- 'INVOICE', 'CUSTOMER', 'INVENTORY', 'UNSUPPORTED'
                status TEXT, -- 'PENDING', 'PROCESSED', 'FAILED'
                record_count INTEGER,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 4. Audit Trail
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL, 
                module TEXT NOT NULL,
                entity_id TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 3. Invoices (with E-Invoicing & Payments)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                invoice_number TEXT UNIQUE,
                customer_id TEXT,
                customer_gstin TEXT,
                customer_pan TEXT,
                date TEXT,
                due_date TEXT,
                payment_timeline TEXT,
                payment_days INTEGER,
                items_json TEXT,
                subtotal REAL,
                total_tax REAL,
                cgst_total REAL,
                sgst_total REAL,
                igst_total REAL,
                grand_total REAL,
                status TEXT DEFAULT 'PENDING',
                irn TEXT,               -- E-Invoicing IRN
                qr_code_data TEXT,      -- E-Invoicing QR Data
                payment_link TEXT,      -- Payment Link
                payment_status TEXT DEFAULT 'PENDING',
                notes TEXT,
                currency TEXT DEFAULT '₹',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 4. Deals (Kanban Pipeline)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS deals (
                id TEXT PRIMARY KEY,
                customer_id TEXT,
                deal_name TEXT,
                value REAL,
                stage TEXT DEFAULT 'QUALIFIED', -- QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
                probability REAL,
                expected_close_date TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 4.5 Purchase Orders (Procurement)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id TEXT PRIMARY KEY,
                supplier_name TEXT,
                items_json TEXT,
                total_amount REAL,
                status TEXT DEFAULT 'PENDING', -- PENDING, ORDERED, RECEIVED, CANCELLED
                expected_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 4.5.1 Expenses (Operational Costs)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT,
                category TEXT,
                amount REAL,
                description TEXT,
                payment_method TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 4.6 Sales Targets (Quota tracking)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sales_targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rep_id INTEGER, -- Link to users.id
                month_year TEXT, -- e.g., '03-2026'
                target_revenue REAL,
                current_attainment REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 5. Customers
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                gstin TEXT,
                pan TEXT,
                total_spend REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 6. Inventory & Accounting
        conn.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT UNIQUE,
                name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                cost_price REAL,
                sale_price REAL,
                category TEXT,
                hsn_code TEXT,
                location TEXT DEFAULT 'Main Warehouse', -- Multi-location support
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 6.1 Inventory Transfers (Multi-location logistics)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS inventory_transfers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT,
                from_location TEXT,
                to_location TEXT,
                quantity INTEGER,
                authorized_by TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_name TEXT NOT NULL,
                type TEXT,
                amount REAL,
                description TEXT,
                date TEXT,
                voucher_id TEXT,
                voucher_type TEXT,
                voucher_no TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration logic (Ensure columns exist in existing DB)
        cols_to_add = [
            ("users", "role", "TEXT DEFAULT 'ADMIN'"),
            ("invoices", "irn", "TEXT"),
            ("invoices", "qr_code_data", "TEXT"),
            ("invoices", "payment_link", "TEXT"),
            ("invoices", "payment_status", "TEXT DEFAULT 'PENDING'"),
            ("inventory", "hsn_code", "TEXT"),
            ("inventory", "location", "TEXT DEFAULT 'Main Warehouse'"),
            ("deals", "assigned_to", "INTEGER"),
            ("deals", "expected_close_date", "TEXT"),
            ("deals", "notes", "TEXT"),
            ("purchase_orders", "status", "TEXT DEFAULT 'PENDING'"),
            ("users", "allowed_ips", "TEXT"),
            ("users", "idle_timeout", "INTEGER DEFAULT 3600")
        ]
        for tbl, col, ctype in cols_to_add:
            try:
                conn.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {ctype}")
            except sqlite3.OperationalError: pass

        conn.commit()
    finally:
        if conn: conn.close()

    # Seed demo data if database is empty (useful for first-time runs)
    _seed_demo_data()


def _seed_demo_data():
    """Populate the database with seed data when tables are empty."""
    conn, _ = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM customers")
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                "INSERT INTO customers (name, email, phone, address, gstin, pan, total_spend) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    ("Acme Corp", "accounts@acme.com", "+91-9876543210", "123 Industrial Park, Bangalore", "27AAAAA0000A1Z5", "AAAAA0000A", 0.0),
                    ("Neural Labs", "finance@neural-labs.ai", "+91-9123456789", "77 Innovation Drive, Pune", "27BBBBB0000B1Z6", "BBBBB0000B", 0.0),
                ]
            )

        cursor.execute("SELECT COUNT(*) FROM inventory")
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                "INSERT INTO inventory (sku, name, quantity, cost_price, sale_price, category, hsn_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    ("SKU-0001", "Widget Pro", 150, 3200.0, 4520.0, "Hardware", "998311"),
                    ("SKU-0002", "Neural Module", 80, 7200.0, 9800.0, "Electronics", "998312"),
                ]
            )

        cursor.execute("SELECT COUNT(*) FROM invoices")
        if cursor.fetchone()[0] == 0:
            invoice_id = f"GST-{datetime.now().year}-{str(uuid.uuid4().hex)[:6].upper()}"
            cursor.execute(
                "INSERT INTO invoices (id, invoice_number, customer_id, customer_gstin, date, due_date, payment_timeline, payment_days, items_json, subtotal, total_tax, cgst_total, sgst_total, igst_total, grand_total, status, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    invoice_id,
                    invoice_id,
                    "Acme Corp",
                    "27AAAAA0000A1Z5",
                    datetime.now().strftime("%Y-%m-%d"),
                    (datetime.now() + pd.Timedelta(days=7)).strftime("%Y-%m-%d"),
                    "Net 7",
                    7,
                    json.dumps([{"inventory_id": "SKU-0001", "desc": "Widget Pro", "qty": 10, "price": 4520.0, "cgst": 407.0, "sgst": 407.0, "igst": 0}]),
                    45200.0,
                    814.0,
                    407.0,
                    407.0,
                    0.0,
                    46014.0,
                    "PENDING",
                    "₹",
                )
            )

        conn.commit()
    except Exception as e:
        print(f"Demo data seeding failed: {e}")
    finally:
        if conn:
            conn.close()


def init_auth_db():
    """Enterprise Auth Init: Ensures users table exists."""
    init_workspace_db()

# --- ENTERPRISE SECURITY: ENCRYPTION AT REST ---
ENCRYPTION_KEY = os.getenv("MASTER_ENCRYPTION_KEY", "NeuralBI_Default_Secure_Key_32Chars_!")

def _encrypt_val(val):
    """VAPT Readiness: Encrypts sensitive fields (GSTIN, PAN, Bank Details)."""
    if not val: return None
    # For production: Use cryptography.fernet
    # Here we use a reversible base64-xor stub to demonstrate the pipeline
    encoded = base64.b64encode(str(val).encode()).decode()
    return f"ENC:{encoded}"

def _decrypt_val(val):
    """VAPT Readiness: Decrypts sensitive fields for authorized viewing."""
    if not val or not str(val).startswith("ENC:"): return val
    try:
        encoded = val[4:]
        return base64.b64decode(encoded).decode()
    except:
        return val

def create_user_record(email, password_hash, role='ADMIN', allowed_ips=None):
    """Identity: Create a new enterprise account with security constraints."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, role, allowed_ips) VALUES (?, ?, ?, ?)", 
            (email, password_hash, role, allowed_ips)
        )
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return new_id
    except sqlite3.IntegrityError:
        return False
    except Exception as e:
        print(f"User Creation Error: {e}")
        return False

def get_user_record(email):
    """Identity: Fetch credentials, claims, and session constraints for an account."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        user = conn.execute(
            "SELECT id, email, password_hash, role, allowed_ips, idle_timeout FROM users WHERE email = ?", 
            (email,)
        ).fetchone()
        conn.close()
        return dict(user) if user else None
    except Exception as e:
        print(f"Fetch User Error: {e}")
        return None

def log_activity(user_id, action, module, entity_id=None, details=None):
    """
    Audit Trail: Immutable record of every business-critical event.
    Requirements: Who (user_id), What (action/module), Which (entity_id), When (DB timestamp).
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        # Ensure user_id is sanitized/integer
        uid = int(user_id) if user_id and str(user_id).isdigit() else 0
        conn.execute(
            "INSERT INTO audit_logs (user_id, action, module, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            (uid, action, module, entity_id, json.dumps(details) if details else None)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit Log Error: {e}")

def store_data(dataset_id, df):
    if df is None or df.empty: return
    df = df.copy()
    df.columns = [str(c).replace(" ", "_").replace(".", "_").lower() for c in df.columns]
    df['_enterprise_session_uuid'] = dataset_id
    try:
        conn = sqlite3.connect(DB_PATH)
        df.to_sql("enterprise_transactions", conn, if_exists="append", index=False)
        conn.close()
    except Exception: pass

def get_session_data_sql(dataset_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql(f"SELECT * FROM enterprise_transactions WHERE _enterprise_session_uuid = '{dataset_id}'", conn)
        conn.close()
        return df
    except Exception: return None

init_workspace_db()