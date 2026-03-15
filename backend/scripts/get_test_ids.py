
import sqlite3
import os

db_path = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\backend\data\enterprise.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Data for STRESS_TEST_001 ---")
cursor.execute("SELECT COUNT(*) FROM invoices WHERE company_id = 'STRESS_TEST_001'")
print(f"Invoices: {cursor.fetchone()[0]}")

cursor.execute("SELECT DISTINCT customer_name FROM invoices WHERE company_id = 'STRESS_TEST_001' LIMIT 5")
print(f"Customer Names: {[r[0] for r in cursor.fetchall()]}")

cursor.execute("SELECT COUNT(*) FROM customers WHERE company_id = 'STRESS_TEST_001'")
print(f"Customers: {cursor.fetchone()[0]}")

conn.close()
