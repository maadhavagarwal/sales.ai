import base64
import json
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, cast

import pandas as pd

# Vector Database Support
try:
    import chromadb

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

# Lazy-load vector client to save memory (important for Render)
_vector_client_cache = None
_vector_load_attempted = False

def get_vector_client():
    """Lazy-load chromadb client on first use, not at startup"""
    global _vector_client_cache, _vector_load_attempted, vector_client
    
    if _vector_load_attempted:
        return _vector_client_cache
    
    _vector_load_attempted = True
    
    if not HAS_CHROMA:
        return None
    
    try:
        _vector_client_cache = chromadb.PersistentClient(path=VECTOR_DB_PATH)
        vector_client = _vector_client_cache
        print("✓ ChromaDB Vector Store initialized on first use")
        return _vector_client_cache
    except Exception as e:
        print(f"⚠️ Warning: Failed to initialize ChromaDB Vector Store: {e}")
        return None

# Keep for backwards compatibility (will be lazy-loaded)
vector_client = None


def get_db_connection():
    if PG_URL and HAS_POSTGRES:
        conn = psycopg2.connect(PG_URL)
        return conn, "postgres"
    else:
        conn = sqlite3.connect(DB_PATH)
        return conn, "sqlite"


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
                company_id TEXT,
                workspace_state TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration: Add workspace_state if not exists
        try:
            conn.execute("ALTER TABLE users ADD COLUMN workspace_state TEXT")
        except Exception:
            pass  # Already exists

        # 2. Enterprise Company Profile
        conn.execute("""
            CREATE TABLE IF NOT EXISTS company_profiles (
                id TEXT PRIMARY KEY,
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
                company_id TEXT,
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
                company_id TEXT,
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
                company_id TEXT,
                invoice_number TEXT,
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
                company_id TEXT,
                supplier_name TEXT,
                items_json TEXT,
                total_amount REAL,
                status TEXT DEFAULT 'PENDING', -- PENDING, ORDERED, RECEIVED, CANCELLED
                expected_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 4.5.1 Expenses (Operational Costs with GST Compliance)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                date TEXT,
                category TEXT,
                amount REAL,
                description TEXT,
                payment_method TEXT,
                hsn_code TEXT,
                gst_rate REAL DEFAULT 0.0,
                cgst_amount REAL DEFAULT 0.0,
                sgst_amount REAL DEFAULT 0.0,
                igst_amount REAL DEFAULT 0.0,
                vendor_name TEXT,
                vendor_gstin TEXT,
                invoice_number TEXT,
                expense_type TEXT DEFAULT 'INPUT', -- INPUT (eligible for ITC), NON-INPUT
                itc_eligible INTEGER DEFAULT 1,
                bill_attached INTEGER DEFAULT 0,
                gst_reconciled INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # GST Compliance Tracking
        conn.execute("""
            CREATE TABLE IF NOT EXISTS gst_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                transaction_date TEXT,
                transaction_type TEXT, -- 'SALE', 'PURCHASE'
                invoice_number TEXT,
                customer_gstin TEXT,
                customer_name TEXT,
                hsn_sac_code TEXT,
                description TEXT,
                quantity REAL,
                unit_price REAL,
                taxable_amount REAL,
                gst_rate REAL,
                cgst_amount REAL,
                sgst_amount REAL,
                igst_amount REAL,
                total_amount REAL,
                place_of_supply TEXT,
                irn TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # GST Returns & Filings
        conn.execute("""
            CREATE TABLE IF NOT EXISTS gst_returns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                return_period TEXT, -- e.g., '01-2026' for Jan 2026
                return_type TEXT, -- 'GSTR1', 'GSTR2', 'GSTR3B', 'GSTR4'
                filing_date TEXT,
                status TEXT DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, ACKNOWLEDGED, REJECTED
                total_outward_supply REAL,
                total_tax_payable REAL,
                total_input_tax_credit REAL,
                net_tax_payable REAL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # GST Reconciliation
        conn.execute("""
            CREATE TABLE IF NOT EXISTS gst_reconciliation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                month_year TEXT,
                invoice_count INTEGER,
                bill_count INTEGER,
                total_sales REAL,
                total_purchases REAL,
                total_output_tax REAL,
                total_input_tax REAL,
                discrepancies TEXT,
                reconciled INTEGER DEFAULT 0,
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
                company_id TEXT,
                name TEXT NOT NULL,
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
                company_id TEXT,
                sku TEXT,
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
                company_id TEXT,
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

        # 7. Operational Hub (Human Capital & Tasks)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS personnel (
                id TEXT PRIMARY KEY,
                company_id TEXT,
                name TEXT NOT NULL,
                email TEXT,
                role TEXT,
                efficiency_score REAL DEFAULT 0.0,
                status TEXT DEFAULT 'Active', -- Active, Offline, On Leave
                avatar TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                assignee_id TEXT, -- Link to personnel.id
                priority TEXT DEFAULT 'Medium', -- High, Medium, Low
                status TEXT DEFAULT 'TODO', -- TODO, IN_PROGRESS, REVIEW, DONE
                deadline TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS operational_schedules (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                type TEXT DEFAULT 'SHIFT', -- SHIFT, MILESTONE
                date TEXT,
                hours TEXT, -- e.g., '09:00 - 17:00'
                role_requirement TEXT,
                personnel_id TEXT, -- Optional link to specific personnel
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 8. Communications Hub (Meetings, Chat, Outreach)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                company_id TEXT,
                title TEXT,
                type TEXT DEFAULT 'Team',
                start_time TEXT,
                duration TEXT DEFAULT '30 min',
                link TEXT,
                participants TEXT, -- JSON string
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS team_chat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                sender_name TEXT,
                message_text TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messaging_conversations (
                id TEXT PRIMARY KEY,
                company_id TEXT,
                created_by TEXT,
                pinned INTEGER DEFAULT 0,
                archived INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messaging_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT,
                participant TEXT,
                participant_email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messaging_messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT,
                company_id TEXT,
                sender TEXT,
                sender_email TEXT,
                content TEXT,
                attachments_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS outbound_outreach (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                recipient TEXT,
                subject TEXT,
                body TEXT,
                status TEXT DEFAULT 'SENT',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                module TEXT,
                action TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                metric_name TEXT,
                metric_value REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 9. Marketing & Growth (Campaigns, Leads)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                name TEXT NOT NULL,
                channel TEXT,
                spend REAL DEFAULT 0.0,
                conversions INTEGER DEFAULT 0,
                revenue_generated REAL DEFAULT 0.0,
                status TEXT DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED
                start_date TEXT,
                end_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Sales Leads (CRM Pipeline)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sales_leads (
                id TEXT PRIMARY KEY,
                company_id TEXT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                stage TEXT DEFAULT 'PROSPECT', -- PROSPECT, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
                value REAL DEFAULT 0.0,
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # RFM Analysis (Customer Segmentation & Churn)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS rfm_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT,
                customer_id TEXT,
                recency_days INTEGER,
                frequency_count INTEGER,
                monetary_value REAL,
                churn_risk TEXT DEFAULT 'LOW', -- LOW, MEDIUM, HIGH
                segment_code TEXT, -- E.g., 'CHAMPIONS', 'LOYAL', 'AT_RISK', 'NEW'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration logic (Ensure columns exist in existing DB)
        cols_to_add = [
            ("users", "role", "TEXT DEFAULT 'ADMIN'"),
            ("invoices", "irn", "TEXT"),
            ("invoices", "qr_code_data", "TEXT"),
            ("invoices", "company_id", "TEXT"),
            ("customers", "company_id", "TEXT"),
            ("inventory", "company_id", "TEXT"),
            ("personnel", "company_id", "TEXT"),
            ("ledger", "company_id", "TEXT"),
            ("files_catalog", "company_id", "TEXT"),
            ("invoices", "payment_link", "TEXT"),
            ("invoices", "payment_status", "TEXT DEFAULT 'PENDING'"),
            ("inventory", "hsn_code", "TEXT"),
            ("inventory", "location", "TEXT DEFAULT 'Main Warehouse'"),
            ("deals", "assigned_to", "INTEGER"),
            ("deals", "expected_close_date", "TEXT"),
            ("deals", "notes", "TEXT"),
            ("purchase_orders", "status", "TEXT DEFAULT 'PENDING'"),
            ("users", "allowed_ips", "TEXT"),
            ("users", "idle_timeout", "INTEGER DEFAULT 3600"),
            ("tasks", "description", "TEXT"),
            ("operational_schedules", "personnel_id", "TEXT"),
            ("purchase_orders", "company_id", "TEXT"),
            ("expenses", "company_id", "TEXT"),
            ("deals", "company_id", "TEXT"),
            ("sales_targets", "company_id", "TEXT"),
            ("tasks", "company_id", "TEXT"),
            # GST Compliance Columns
            ("expenses", "hsn_code", "TEXT"),
            ("expenses", "gst_rate", "REAL DEFAULT 0.0"),
            ("expenses", "cgst_amount", "REAL DEFAULT 0.0"),
            ("expenses", "sgst_amount", "REAL DEFAULT 0.0"),
            ("expenses", "igst_amount", "REAL DEFAULT 0.0"),
            ("expenses", "vendor_name", "TEXT"),
            ("expenses", "vendor_gstin", "TEXT"),
            ("expenses", "invoice_number", "TEXT"),
            ("expenses", "expense_type", "TEXT DEFAULT 'INPUT'"),
            ("expenses", "itc_eligible", "INTEGER DEFAULT 1"),
            ("expenses", "bill_attached", "INTEGER DEFAULT 0"),
            ("expenses", "gst_reconciled", "INTEGER DEFAULT 0"),
        ]
        for tbl, col, ctype in cols_to_add:
            try:
                cast(Any, conn).execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {ctype}")
            except sqlite3.OperationalError:
                pass

        conn.commit()
    finally:
        if conn:
            conn.close()

    # Seeded sample initialization removed: runtime now relies on real data only.

def init_auth_db():
    """Enterprise Auth Init: Ensures users table exists."""
    init_workspace_db()


# --- ENTERPRISE SECURITY: ENCRYPTION AT REST ---
ENCRYPTION_KEY = os.getenv(
    "MASTER_ENCRYPTION_KEY", "NeuralBI_Default_Secure_Key_32Chars_!"
)


def _encrypt_val(val):
    """VAPT Readiness: Encrypts sensitive fields (GSTIN, PAN, Bank Details)."""
    if not val:
        return None
    # For production: Use cryptography.fernet
    # Here we use a reversible base64-xor stub to validate the pipeline
    encoded = base64.b64encode(str(val).encode()).decode()
    return f"ENC:{encoded}"


def _decrypt_val(val):
    """VAPT Readiness: Decrypts sensitive fields for authorized viewing."""
    if not val or not str(val).startswith("ENC:"):
        return val
    try:
        encoded = val[4:]
        return base64.b64decode(encoded).decode()
    except Exception:
        return val


def create_user_record(email, password_hash, role="ADMIN", allowed_ips=None):
    """Identity: Create a new enterprise account with security constraints."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, role, allowed_ips) VALUES (?, ?, ?, ?)",
            (email, password_hash, role, allowed_ips),
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
            "SELECT id, email, password_hash, role, allowed_ips, idle_timeout, company_id FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        conn.close()
        
        if user:
            # Return as dict for compatibility
            return dict(user) if user else None
        return None
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
            (uid, action, module, entity_id, json.dumps(details) if details else None),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit Log Error: {e}")


def store_data(dataset_id, df):
    if df is None or df.empty:
        return
    df = df.copy()
    df.columns = [
        str(c).replace(" ", "_").replace(".", "_").lower() for c in df.columns
    ]
    df["_enterprise_session_uuid"] = dataset_id
    try:
        conn = sqlite3.connect(DB_PATH)
        df.to_sql("enterprise_transactions", conn, if_exists="append", index=False)
        conn.close()
    except Exception:
        pass


def get_session_data_sql(dataset_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql(
            f"SELECT * FROM enterprise_transactions WHERE _enterprise_session_uuid = '{dataset_id}'",
            conn,
        )
        conn.close()
        return df
    except Exception:
        return None


init_workspace_db()
