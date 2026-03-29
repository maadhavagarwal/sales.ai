import sqlite3
import os
import sys

# Add backend to sys.path for app imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.tenant import Organization, User

def sync_dbs():
    # 1. Update SQLAlchemy app.db
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.id == 1).first()
        if not org:
            org = Organization(id=1, name='NeuralBI Demo Corp', subscription_plan='ENTERPRISE', subscription_status='ACTIVE')
            db.add(org)
        
        org.uuid = "NEURAL-BI-ORG-01"
        
        user = db.query(User).filter(User.email == "admin@neuralbi.com").first()
        if user:
            user.is_active = True
            # Since membership is established via .organizations relationship
            if org not in user.organizations:
                user.organizations.append(org)
        
        db.commit()
        print("✓ app.db successfully synced with UUID NEURAL-BI-ORG-01")
    except Exception as e:
        print(f"✗ app.db sync failed: {e}")
        db.rollback()
    finally:
        db.close()

    # 2. Update enterprise.db
    try:
        conn = sqlite3.connect('data/enterprise.db')
        conn.execute("UPDATE users SET company_id='NEURAL-BI-ORG-01' WHERE email='admin@neuralbi.com'")
        # Ensure the organization also exists in enterprise.db's organizations table if any
        conn.execute("""
            INSERT OR IGNORE INTO organizations (uuid, name, subscription_plan, subscription_status, is_active)
            VALUES ('NEURAL-BI-ORG-01', 'NeuralBI Demo Corp', 'ENTERPRISE', 'ACTIVE', 1)
        """)
        conn.commit()
        conn.close()
        print("✓ enterprise.db successfully synced with UUID NEURAL-BI-ORG-01")
    except Exception as e:
        print(f"✗ enterprise.db sync failed: {e}")

if __name__ == "__main__":
    sync_dbs()
