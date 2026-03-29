import bcrypt
import sqlite3

conn = sqlite3.connect('data/enterprise.db')
cursor = conn.cursor()
cursor.execute('SELECT password_hash FROM users WHERE email = ?', ('admin@neuralbi.com',))
row = cursor.fetchone()
conn.close()

if row:
    stored_hash = row[0]
    password = "admin123"
    result = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f"Password 'admin123' matches the stored hash: {result}")
else:
    print("Admin user not found")
