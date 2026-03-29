import bcrypt
import sqlite3

# Generate hash for admin123
password = "admin123"
salt = bcrypt.gensalt()
pwd_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

print(f"Generated hash for 'admin123': {pwd_hash}")

# Update the database
conn = sqlite3.connect('data/enterprise.db')
cursor = conn.cursor()
cursor.execute(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    (pwd_hash, 'admin@neuralbi.com')
)
conn.commit()
conn.close()

print("✓ Password hash updated in database")

# Verify the update
conn = sqlite3.connect('data/enterprise.db')
cursor = conn.cursor()
cursor.execute('SELECT password_hash FROM users WHERE email = ?', ('admin@neuralbi.com',))
updated_hash = cursor.fetchone()[0]
conn.close()

# Test verification
result = bcrypt.checkpw(password.encode('utf-8'), updated_hash.encode('utf-8'))
print(f"✓ Verification successful: {result}")
