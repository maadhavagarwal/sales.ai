import sqlite3
import os
import pandas as pd

# Define a shared database location in the 'data' directory
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "business_data.db")

def store_data(dataset_id, df):
    """
    Persistently stores the dataframe into the business_data.db SQLite backend.
    Instead of replacing, we now ‘append’ but tag each row with the session dataset_id.
    """
    if df is None or df.empty:
        return

    # Create directory if missing
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Simple normalization for SQL column headers (removes spaces/dots)
    df = df.copy()
    df.columns = [str(c).replace(" ", "_").replace(".", "_").lower() for c in df.columns]
    
    # Tagging all rows so different users' data can exist in the same Enterprise table
    df['_enterprise_session_uuid'] = dataset_id

    try:
        conn = sqlite3.connect(DB_PATH)
        # We use append to make the system highly scalable across different uploads
        df.to_sql("enterprise_transactions", conn, if_exists="append", index=False)
        conn.close()
    except Exception as e:
        print(f"SQL Storage Error: {e}")

# --- USER MANAGEMENT ---
def init_auth_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    finally:
        conn.close()

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