"""
User Analytics Tracking Service
Tracks feature usage, conversion funnels, and user engagement metrics
"""

import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict


class AnalyticsService:
    """Track and analyze user behavior and engagement"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_analytics_schema()
    
    def _init_analytics_schema(self):
        """Initialize analytics tracking tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Event tracking table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_name TEXT,
                data JSONB,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(company_id) REFERENCES companies(id)
            )
        """)
        
        # User session table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                session_start DATETIME,
                session_end DATETIME,
                duration_minutes INTEGER,
                features_used TEXT,
                ip_address TEXT
            )
        """)
        
        # Feature usage table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feature_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                feature_name TEXT NOT NULL,
                usage_count INTEGER DEFAULT 1,
                last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
                first_used DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Conversion funnel table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversion_funnel (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                stage TEXT NOT NULL,
                status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB
            )
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_events ON user_events(user_id, company_id, timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_feature_usage ON feature_usage(company_id, feature_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversion ON conversion_funnel(company_id, stage)")
        
        conn.commit()
        conn.close()
    
    def track_event(
        self,
        user_id: str,
        company_id: str,
        event_type: str,
        event_name: str,
        data: Optional[Dict[str, Any]] = None
    ):
        """Track a user event"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            import json
            data_json = json.dumps(data) if data else None
            
            cursor.execute("""
                INSERT INTO user_events (user_id, company_id, event_type, event_name, data)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, company_id, event_type, event_name, data_json))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Analytics tracking error: {str(e)}")
    
    def track_feature_usage(
        self,
        user_id: str,
        company_id: str,
        feature_name: str
    ):
        """Track feature usage with incrementing counter"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if already tracked
            cursor.execute("""
                SELECT id, usage_count FROM feature_usage
                WHERE user_id = ? AND company_id = ? AND feature_name = ?
            """, (user_id, company_id, feature_name))
            
            row = cursor.fetchone()
            
            if row:
                # Increment counter
                cursor.execute("""
                    UPDATE feature_usage
                    SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (row[0],))
            else:
                # New feature usage
                cursor.execute("""
                    INSERT INTO feature_usage (user_id, company_id, feature_name, usage_count)
                    VALUES (?, ?, ?, 1)
                """, (user_id, company_id, feature_name))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Feature tracking error: {str(e)}")
    
    def track_conversion_funnel(
        self,
        user_id: str,
        company_id: str,
        stage: str,
        status: str = "completed",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Track conversion funnel steps"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            import json
            metadata_json = json.dumps(metadata) if metadata else None
            
            cursor.execute("""
                INSERT INTO conversion_funnel (user_id, company_id, stage, status, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, company_id, stage, status, metadata_json))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Conversion tracking error: {str(e)}")
    
    def get_feature_usage_stats(
        self,
        company_id: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get feature usage statistics for company"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            cursor.execute("""
                SELECT feature_name, COUNT(*) as usage_count, COUNT(DISTINCT user_id) as unique_users
                FROM feature_usage
                WHERE company_id = ? AND last_used > ?
                GROUP BY feature_name
                ORDER BY usage_count DESC
            """, (company_id, cutoff_date))
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    "feature": row[0],
                    "total_uses": row[1],
                    "unique_users": row[2],
                    "avg_per_user": round(row[1] / max(1, row[2]), 2)
                })
            
            conn.close()
            return results
        except Exception as e:
            print(f"Stats error: {str(e)}")
            return []
    
    def get_user_journey(
        self,
        user_id: str,
        company_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get complete user journey/engagement"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Get all events
            cursor.execute("""
                SELECT event_type, event_name, timestamp
                FROM user_events
                WHERE user_id = ? AND company_id = ? AND timestamp > ?
                ORDER BY timestamp
            """, (user_id, company_id, cutoff_date))
            
            events = [
                {
                    "type": row[0],
                    "name": row[1],
                    "timestamp": row[2]
                }
                for row in cursor.fetchall()
            ]
            
            # Get feature usage
            cursor.execute("""
                SELECT feature_name, usage_count, last_used
                FROM feature_usage
                WHERE user_id = ? AND company_id = ? AND last_used > ?
                ORDER BY last_used DESC
            """, (user_id, company_id, cutoff_date))
            
            features = [
                {
                    "feature": row[0],
                    "uses": row[1],
                    "last_used": row[2]
                }
                for row in cursor.fetchall()
            ]
            
            # Get conversion funnel progress
            cursor.execute("""
                SELECT stage, status, timestamp
                FROM conversion_funnel
                WHERE user_id = ? AND company_id = ? AND timestamp > ?
                ORDER BY timestamp
            """, (user_id, company_id, cutoff_date))
            
            funnel = [
                {
                    "stage": row[0],
                    "status": row[1],
                    "timestamp": row[2]
                }
                for row in cursor.fetchall()
            ]
            
            conn.close()
            
            return {
                "user_id": user_id,
                "total_events": len(events),
                "features_used": len(features),
                "conversion_stages": len(funnel),
                "events": events,
                "features": features,
                "funnel": funnel
            }
        except Exception as e:
            print(f"Journey error: {str(e)}")
            return {}
    
    def get_conversion_funnel_stats(
        self,
        company_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get conversion funnel analysis"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Get all conversion stages
            cursor.execute("""
                SELECT DISTINCT stage FROM conversion_funnel
                WHERE company_id = ?
                ORDER BY stage
            """, (company_id,))
            
            stages = [row[0] for row in cursor.fetchall()]
            
            funnel_data = {}
            for stage in stages:
                cursor.execute("""
                    SELECT COUNT(DISTINCT user_id) as count FROM conversion_funnel
                    WHERE company_id = ? AND stage = ? AND timestamp > ?
                """, (company_id, stage, cutoff_date))
                
                count = cursor.fetchone()[0]
                funnel_data[stage] = count
            
            # Calculate conversion rates
            stages_list = list(funnel_data.keys())
            total = funnel_data.get(stages_list[0], 1) if stages_list else 1
            
            conversion_rates = {}
            for stage in stages_list:
                conversion_rates[stage] = {
                    "count": funnel_data[stage],
                    "rate": round(funnel_data[stage] / max(1, total) * 100, 2)
                }
            
            conn.close()
            
            return {
                "total_users": total,
                "stages": conversion_rates,
                "completion_rate": round(funnel_data.get(stages_list[-1], 0) / max(1, total) * 100, 2) if stages_list else 0
            }
        except Exception as e:
            print(f"Conversion stats error: {str(e)}")
            return {}
    
    def get_engagement_metrics(
        self,
        company_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get overall engagement metrics for company"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Total active users
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id) FROM user_events
                WHERE company_id = ? AND timestamp > ?
            """, (company_id, cutoff_date))
            
            active_users = cursor.fetchone()[0]
            
            # Total events
            cursor.execute("""
                SELECT COUNT(*) FROM user_events
                WHERE company_id = ? AND timestamp > ?
            """, (company_id, cutoff_date))
            
            total_events = cursor.fetchone()[0]
            
            # Most used features
            cursor.execute("""
                SELECT feature_name, SUM(usage_count) as total_uses
                FROM feature_usage
                WHERE company_id = ? AND last_used > ?
                GROUP BY feature_name
                ORDER BY total_uses DESC
                LIMIT 5
            """, (company_id, cutoff_date))
            
            top_features = [
                {"feature": row[0], "uses": row[1]}
                for row in cursor.fetchall()
            ]
            
            # Event types breakdown
            cursor.execute("""
                SELECT event_type, COUNT(*) as count
                FROM user_events
                WHERE company_id = ? AND timestamp > ?
                GROUP BY event_type
            """, (company_id, cutoff_date))
            
            event_breakdown = [
                {"type": row[0], "count": row[1]}
                for row in cursor.fetchall()
            ]
            
            conn.close()
            
            return {
                "period_days": days,
                "active_users": active_users,
                "total_events": total_events,
                "avg_events_per_user": round(total_events / max(1, active_users), 2),
                "top_features": top_features,
                "event_breakdown": event_breakdown
            }
        except Exception as e:
            print(f"Engagement metrics error: {str(e)}")
            return {}
    
    def get_cohort_analysis(
        self,
        company_id: str,
        cohort_size: int = 7
    ) -> Dict[str, Any]:
        """Analyze user cohorts by signup date"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get users grouped by signup week
            cursor.execute("""
                SELECT 
                    DATE(MIN(timestamp)) as cohort_date,
                    COUNT(DISTINCT user_id) as users,
                    COUNT(*) as total_events
                FROM user_events
                WHERE company_id = ?
                GROUP BY DATE(timestamp)
                ORDER BY cohort_date DESC
                LIMIT 10
            """, (company_id,))
            
            cohorts = [
                {
                    "cohort": row[0],
                    "users": row[1],
                    "events": row[2],
                    "avg_events": round(row[2] / max(1, row[1]), 2)
                }
                for row in cursor.fetchall()
            ]
            
            conn.close()
            return {"cohorts": cohorts}
        except Exception as e:
            print(f"Cohort error: {str(e)}")
            return {}


# Common funnel stages for tracking
FUNNEL_STAGES = {
    "signup": "User signup completed",
    "first_login": "User first login",
    "upload": "First data upload",
    "insights_viewed": "Viewed insights",
    "export_generated": "Generated report",
    "integration_added": "Added integration",
    "subscription_upgraded": "Upgraded subscription"
}


def get_analytics_service(db_path: str) -> AnalyticsService:
    """Factory function to get analytics service instance"""
    return AnalyticsService(db_path)
