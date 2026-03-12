import sqlite3
import os
import pandas as pd
import json

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

# Robust project root resolution
# BASE_DIR should be the project root where 'backend' and 'data' folders reside.
# This assumes the script is in a structure like project_root/backend/some_dir/this_script.py
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")

if not os.path.exists(DATA_DIR):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
    except Exception as e:
        print(f"Warning: Could not create DATA_DIR at {DATA_DIR}: {e}")
        # Fallback to current working directory if root is read-only or inaccessible
        DATA_DIR = os.path.join(os.getcwd(), "data")
        os.makedirs(DATA_DIR, exist_ok=True)
        print(f"Attempting to use current working directory for DATA_DIR: {DATA_DIR}")

DB_PATH = os.path.join(DATA_DIR, "enterprise.db")
AUTH_DB_PATH = os.path.join(DATA_DIR, "auth.db")
VECTOR_DB_PATH = os.path.join(DATA_DIR, "vector_store")

# Allow an environment variable to override SQLite with PostgreSQL
PG_URL = os.environ.get("DATABASE_URL", None)

# Ensure DATA_DIR exists
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(VECTOR_DB_PATH, exist_ok=True)

# --- VECTOR DATABASE INITIALIZATION ---
vector_client = None
if HAS_CHROMA:
    try:
        vector_client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
    except Exception as e:
        print(f"Warning: Failed to initialize ChromaDB Vector Store. {e}")

def get_db_connection():
    """Returns a connection to PostgreSQL if configured, else SQLite."""
    if PG_URL and HAS_POSTGRES:
        conn = psycopg2.connect(PG_URL)
        # Psycopg2 requires specific cursor configurations depending on the query
        return conn, 'postgres'
    else:
        conn = sqlite3.connect(DB_PATH)
        return conn, 'sqlite'

def init_workspace_db():
    conn, db_type = get_db_connection()
    try:
        if db_type == 'postgres':
            # Basic Postgres schema configuration mapped below via SQLAlchemy or direct queries
            # For brevity, assuming the SQLite fallback for current direct execution
            pass
   
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
                payment_timeline TEXT,
                payment_days INTEGER,
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
                name TEXT UNIQUE NOT NULL,
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
                voucher_id TEXT,
                voucher_type TEXT, -- Contra, Payment, Receipt, Journal, Sales, Purchase
                voucher_no TEXT,
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
            conn.execute("ALTER TABLE invoices ADD COLUMN payment_terms TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN payment_timeline TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN payment_days INTEGER DEFAULT 0")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE invoices ADD COLUMN reminder_last_sent TEXT")
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

        # Usage Logs for Software Usage Reporting
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module TEXT,
                action TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Ensure missing columns exist in ledger (Tally Update)
        try:
            conn.execute("ALTER TABLE ledger ADD COLUMN voucher_id TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE ledger ADD COLUMN voucher_type TEXT")
        except sqlite3.OperationalError: pass
        try:
            conn.execute("ALTER TABLE ledger ADD COLUMN voucher_no TEXT")
        except sqlite3.OperationalError: pass

        conn.execute("CREATE INDEX IF NOT EXISTS idx_ledger_type_account ON ledger(type, account_name)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ledger_voucher_date ON ledger(voucher_id, date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_invoices_customer_date ON invoices(customer_id, date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)")

        conn.commit()
    finally:
        if conn:
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

    # --- VECTOR DATABASE SYNC ---
    if vector_client is not None:
        try:
            # Create a collection for this dataset isolated by ID
            collection_name = f"dataset_{dataset_id.replace('-', '_')}" 
            # Drop previous if re-uploading
            try:
                vector_client.delete_collection(collection_name)
            except Exception:
                pass
                
            collection = vector_client.create_collection(name=collection_name)
            
            # Subsample massive datasets to avoid memory lock or batch it
            sample_df = df.head(1000) if len(df) > 1000 else df
            
            # Stringify row by row for RAG
            documents = []
            ids = []
            metadatas = []
            
            for idx, row in sample_df.iterrows():
                doc_str = " | ".join([f"{col}: {val}" for col, val in row.items() if str(val) != 'nan'])
                documents.append(doc_str)
                ids.append(f"row_{idx}")
                metadatas.append({"source": dataset_id, "row_index": idx})
                
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            print(f"Vectorization complete: {len(documents)} logic chunks stored for RAG.")
        except Exception as e:
            print(f"Vector Database Storage Error: {e}")

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
