"""
Customer Portal Service
Handles customer-facing features, portal access, and company data isolation
"""

import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
import json


class CustomerPortalService:
    """Manage customer portal access and features"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_portal_schema()
    
    def _init_portal_schema(self):
        """Initialize portal-specific tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Portal users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portal_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                portal_access BOOLEAN DEFAULT 1,
                portal_role TEXT DEFAULT 'customer',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                status TEXT DEFAULT 'active'
            )
        """)
        
        # Customer profile table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                contact_email TEXT,
                contact_phone TEXT,
                address TEXT,
                industry TEXT,
                customer_type TEXT,
                lifetime_value DECIMAL(15,2) DEFAULT 0,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, customer_name)
            )
        """)
        
        # Portal activity log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portal_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT NOT NULL,
                activity_type TEXT,
                description TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_portal_users ON portal_users(company_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_profiles ON customer_profiles(company_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_portal_activity ON portal_activity(company_id, timestamp)")
        
        conn.commit()
        conn.close()
    
    def get_portal_dashboard(self, company_id: str) -> Dict[str, Any]:
        """Get portal dashboard data for company"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get customer count
            cursor.execute(
                "SELECT COUNT(*) FROM customer_profiles WHERE company_id = ? AND status = 'active'",
                (company_id,)
            )
            customer_count = cursor.fetchone()[0]
            
            # Get total lifetime value
            cursor.execute(
                "SELECT COALESCE(SUM(lifetime_value), 0) FROM customer_profiles WHERE company_id = ?",
                (company_id,)
            )
            total_ltv = cursor.fetchone()[0]
            
            # Get recent activity
            cursor.execute(
                """SELECT activity_type, COUNT(*) FROM portal_activity 
                   WHERE company_id = ? AND timestamp > datetime('now', '-30 days')
                   GROUP BY activity_type ORDER BY COUNT(*) DESC LIMIT 5""",
                (company_id,)
            )
            
            activity_summary = [
                {"type": row[0], "count": row[1]}
                for row in cursor.fetchall()
            ]
            
            conn.close()
            
            return {
                "company_id": company_id,
                "total_customers": customer_count,
                "total_lifetime_value": float(total_ltv),
                "recent_activity": activity_summary,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Portal dashboard error: {str(e)}")
            return {}
    
    def list_customers(self, company_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """List all customers for company"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                """SELECT id, customer_name, contact_email, contact_phone, 
                          customer_type, lifetime_value, status, created_at
                   FROM customer_profiles 
                   WHERE company_id = ? AND status = 'active'
                   ORDER BY lifetime_value DESC
                   LIMIT ?""",
                (company_id, limit)
            )
            
            customers = []
            for row in cursor.fetchall():
                customers.append({
                    "id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "phone": row[3],
                    "type": row[4],
                    "lifetime_value": float(row[5]),
                    "status": row[6],
                    "created_at": row[7]
                })
            
            conn.close()
            return customers
        except Exception as e:
            print(f"List customers error: {str(e)}")
            return []
    
    def create_customer(
        self,
        company_id: str,
        customer_name: str,
        contact_email: str = None,
        contact_phone: str = None,
        address: str = None,
        industry: str = None,
        customer_type: str = "prospect"
    ) -> Dict[str, Any]:
        """Create new customer record"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                """INSERT INTO customer_profiles 
                   (company_id, customer_name, contact_email, contact_phone, address, industry, customer_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (company_id, customer_name, contact_email, contact_phone, address, industry, customer_type)
            )
            
            customer_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return {
                "id": customer_id,
                "name": customer_name,
                "status": "created"
            }
        except sqlite3.IntegrityError:
            return {"error": "Customer already exists", "name": customer_name}
        except Exception as e:
            return {"error": str(e)}
    
    def update_customer(
        self,
        company_id: str,
        customer_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update customer record"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Verify ownership
            cursor.execute(
                "SELECT id FROM customer_profiles WHERE id = ? AND company_id = ?",
                (customer_id, company_id)
            )
            
            if not cursor.fetchone():
                return {"error": "Customer not found or unauthorized"}
            
            # Build update query
            allowed_fields = ["customer_name", "contact_email", "contact_phone", "address", "industry", "customer_type", "status", "lifetime_value"]
            set_clause = ", ".join([f"{k} = ?" for k in updates.keys() if k in allowed_fields])
            
            if not set_clause:
                return {"error": "No valid fields to update"}
            
            values = [updates[k] for k in updates.keys() if k in allowed_fields]
            values.extend([customer_id, company_id])
            
            cursor.execute(
                f"UPDATE customer_profiles SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                values
            )
            
            conn.commit()
            conn.close()
            
            return {"status": "updated", "customer_id": customer_id}
        except Exception as e:
            return {"error": str(e)}
    
    def get_customer_details(self, company_id: str, customer_id: int) -> Dict[str, Any]:
        """Get detailed customer information"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                """SELECT id, customer_name, contact_email, contact_phone, address, 
                          industry, customer_type, lifetime_value, status, created_at, updated_at
                   FROM customer_profiles 
                   WHERE id = ? AND company_id = ?""",
                (customer_id, company_id)
            )
            
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                return {"error": "Customer not found"}
            
            return {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "phone": row[3],
                "address": row[4],
                "industry": row[5],
                "type": row[6],
                "lifetime_value": float(row[7]),
                "status": row[8],
                "created_at": row[9],
                "updated_at": row[10]
            }
        except Exception as e:
            return {"error": str(e)}
    
    def log_portal_activity(
        self,
        company_id: str,
        activity_type: str,
        description: str = None,
        metadata: Dict[str, Any] = None
    ):
        """Log portal activity for audit trail"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            metadata_json = json.dumps(metadata) if metadata else None
            
            cursor.execute(
                """INSERT INTO portal_activity (company_id, activity_type, description, metadata)
                   VALUES (?, ?, ?, ?)""",
                (company_id, activity_type, description, metadata_json)
            )
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Activity log error: {str(e)}")


def get_customer_portal_service(db_path: str) -> CustomerPortalService:
    """Factory function to get portal service instance"""
    return CustomerPortalService(db_path)
