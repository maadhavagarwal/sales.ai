import sqlite3
import pandas as pd

conn = sqlite3.connect('data/enterprise.db')
df = pd.read_sql("SELECT id, email, role, company_id FROM users", conn)
print("=== USERS ===")
print(df)

df_org = pd.read_sql("SELECT * FROM organizations", conn)
print("=== ORGS ===")
print(df_org.head())
