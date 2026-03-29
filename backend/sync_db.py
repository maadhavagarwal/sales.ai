import sqlite3
from app.core.database import SessionLocal
from app.models.tenant import Organization

conn = sqlite3.connect('data/enterprise.db')
res = conn.execute("SELECT company_id FROM users WHERE email='admin@neuralbi.com'").fetchone()

if res:
    comp_id = res[0]
    db = SessionLocal()
    org = db.query(Organization).filter(Organization.name == 'NeuralBI Demo Corp').first()
    if org:
        org.uuid = comp_id
        db.commit()
        print(f"Updated app.db org.uuid to match enterprise.db: {comp_id}")
    else:
        print("Org not found in app.db")
else:
    print("User not found in enterprise.db")
