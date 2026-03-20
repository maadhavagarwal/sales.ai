"""
Segment Analysis Engine — Full Production Implementation
Provides: RFM Segmentation, K-Means Clustering, Rule-Based Filtering,
Dynamic Segment Builder, Real-Time Updates, Segment Insights, and API.
"""

import hashlib
import json
import math
import sqlite3
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from app.core.database_manager import DB_PATH


# ---------- SCHEMA ----------
_SEGMENT_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT DEFAULT 'rule',             -- rule | rfm | ai_cluster | auto
    rules_json TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',         -- active | archived
    auto_refresh INTEGER DEFAULT 0,      -- 1 = live refresh
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS segment_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    score REAL DEFAULT 0.0,
    metadata_json TEXT DEFAULT '{}',
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(segment_id, customer_id)
);

CREATE TABLE IF NOT EXISTS segment_triggers (
    id TEXT PRIMARY KEY,
    segment_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,           -- entry | exit | threshold
    action_type TEXT NOT NULL,             -- email | webhook | document | alert
    action_config TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    last_fired TEXT,
    fire_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS segment_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    member_count INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0.0,
    avg_order_value REAL DEFAULT 0.0,
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seg_company ON segments(company_id);
CREATE INDEX IF NOT EXISTS idx_seg_member ON segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_seg_snapshot ON segment_snapshots(segment_id, snapshot_date);
"""


def _init_segment_tables():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(_SEGMENT_TABLES_SQL)
    conn.commit()
    conn.close()


# Ensure tables exist on import
try:
    _init_segment_tables()
except Exception:
    pass


class SegmentEngine:
    """Full-featured Segment Analysis Engine."""

    # ---- RFM SCORING ----
    @staticmethod
    def compute_rfm(company_id: str) -> List[Dict[str, Any]]:
        """Compute RFM (Recency, Frequency, Monetary) scores for all customers."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute("""
                SELECT customer_id,
                       MAX(date) as last_order,
                       COUNT(*) as frequency,
                       SUM(grand_total) as monetary
                FROM invoices
                WHERE company_id = ?
                GROUP BY customer_id
            """, (company_id,)).fetchall()

            if not rows:
                return []

            now = datetime.now()
            rfm_data = []

            for r in rows:
                try:
                    last = datetime.strptime(str(r["last_order"])[:10], "%Y-%m-%d")
                    recency_days = (now - last).days
                except Exception:
                    recency_days = 999

                freq = int(r["frequency"] or 0)
                monetary = float(r["monetary"] or 0)
                rfm_data.append({
                    "customer_id": r["customer_id"],
                    "recency_days": recency_days,
                    "frequency": freq,
                    "monetary": round(monetary, 2),
                })

            if not rfm_data:
                return []

            # Score each dimension 1-5
            rec_vals = sorted(set(d["recency_days"] for d in rfm_data))
            freq_vals = sorted(set(d["frequency"] for d in rfm_data))
            mon_vals = sorted(set(d["monetary"] for d in rfm_data))

            def _quintile(val, sorted_vals, reverse=False):
                if len(sorted_vals) <= 1:
                    return 3
                idx = sorted_vals.index(val) if val in sorted_vals else 0
                pct = idx / max(len(sorted_vals) - 1, 1)
                if reverse:
                    pct = 1 - pct
                return min(5, max(1, int(pct * 5) + 1))

            for d in rfm_data:
                d["r_score"] = _quintile(d["recency_days"], rec_vals, reverse=True)
                d["f_score"] = _quintile(d["frequency"], freq_vals)
                d["m_score"] = _quintile(d["monetary"], mon_vals)
                d["rfm_score"] = d["r_score"] * 100 + d["f_score"] * 10 + d["m_score"]
                total = d["r_score"] + d["f_score"] + d["m_score"]

                if total >= 13:
                    d["segment"] = "Champions"
                elif total >= 10:
                    d["segment"] = "Loyal Customers"
                elif d["r_score"] >= 4 and d["f_score"] <= 2:
                    d["segment"] = "New Customers"
                elif d["r_score"] <= 2 and d["f_score"] >= 3:
                    d["segment"] = "At Risk"
                elif d["r_score"] <= 2 and d["f_score"] <= 2:
                    d["segment"] = "Lost"
                elif total >= 7:
                    d["segment"] = "Potential Loyalists"
                else:
                    d["segment"] = "Hibernating"

            return rfm_data
        finally:
            conn.close()

    # ---- AI CLUSTERING (K-Means) ----
    @staticmethod
    def run_ai_clustering(company_id: str, n_clusters: int = 4) -> Dict[str, Any]:
        """Run K-Means clustering on customer transaction data."""
        rfm_data = SegmentEngine.compute_rfm(company_id)
        if not rfm_data or len(rfm_data) < n_clusters:
            return {
                "status": "insufficient_data",
                "clusters": [],
                "message": f"Need at least {n_clusters} customers for clustering",
            }

        if not SKLEARN_AVAILABLE:
            # Fallback: simple quartile-based clustering
            return SegmentEngine._fallback_clustering(rfm_data, n_clusters)

        features = np.array([
            [d["recency_days"], d["frequency"], d["monetary"]]
            for d in rfm_data
        ])

        scaler = StandardScaler()
        scaled = scaler.fit_transform(features)

        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(scaled)

        cluster_names = [
            "High-Value Active", "Growth Potential", "At-Risk Valuable",
            "Dormant", "New Prospects", "Price Sensitive", "Occasional Buyers", "VIP"
        ]

        clusters = defaultdict(list)
        for i, label in enumerate(labels):
            rfm_data[i]["cluster"] = int(label)
            rfm_data[i]["cluster_name"] = cluster_names[label % len(cluster_names)]
            clusters[int(label)].append(rfm_data[i])

        cluster_summaries = []
        for cluster_id, members in clusters.items():
            avg_recency = sum(m["recency_days"] for m in members) / len(members)
            avg_freq = sum(m["frequency"] for m in members) / len(members)
            avg_monetary = sum(m["monetary"] for m in members) / len(members)
            cluster_summaries.append({
                "cluster_id": cluster_id,
                "cluster_name": cluster_names[cluster_id % len(cluster_names)],
                "member_count": len(members),
                "avg_recency_days": round(avg_recency, 1),
                "avg_frequency": round(avg_freq, 1),
                "avg_monetary": round(avg_monetary, 2),
                "total_revenue": round(sum(m["monetary"] for m in members), 2),
            })

        return {
            "status": "success",
            "algorithm": "KMeans",
            "n_clusters": n_clusters,
            "total_customers": len(rfm_data),
            "clusters": cluster_summaries,
            "customer_assignments": rfm_data,
            "inertia": round(float(kmeans.inertia_), 2) if hasattr(kmeans, "inertia_") else 0,
        }

    @staticmethod
    def _fallback_clustering(rfm_data: list, n_clusters: int) -> Dict[str, Any]:
        """Simple quartile-based fallback when sklearn is unavailable."""
        sorted_data = sorted(rfm_data, key=lambda x: x["monetary"], reverse=True)
        chunk_size = max(1, len(sorted_data) // n_clusters)
        clusters = []
        cluster_names = ["Premium", "Standard", "Economy", "Dormant"]

        for i in range(n_clusters):
            start = i * chunk_size
            end = start + chunk_size if i < n_clusters - 1 else len(sorted_data)
            members = sorted_data[start:end]
            for m in members:
                m["cluster"] = i
                m["cluster_name"] = cluster_names[i % len(cluster_names)]
            clusters.append({
                "cluster_id": i,
                "cluster_name": cluster_names[i % len(cluster_names)],
                "member_count": len(members),
                "avg_monetary": round(sum(m["monetary"] for m in members) / max(len(members), 1), 2),
                "total_revenue": round(sum(m["monetary"] for m in members), 2),
            })

        return {
            "status": "success",
            "algorithm": "QuartileBased (sklearn unavailable)",
            "n_clusters": n_clusters,
            "total_customers": len(rfm_data),
            "clusters": clusters,
            "customer_assignments": sorted_data,
        }

    # ---- RULE-BASED SEGMENTATION ----
    @staticmethod
    def create_segment(
        company_id: str,
        name: str,
        segment_type: str = "rule",
        rules: Optional[List[Dict]] = None,
        description: str = "",
        auto_refresh: bool = False,
        created_by: int = 1,
    ) -> Dict[str, Any]:
        """Create a new segment with optional rules."""
        segment_id = f"SEG-{uuid.uuid4().hex[:8].upper()}"
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO segments (id, company_id, name, description, type, rules_json, auto_refresh, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                segment_id, company_id, name, description, segment_type,
                json.dumps(rules or []), 1 if auto_refresh else 0, created_by,
            ))
            conn.commit()

            # If rules provided, evaluate and populate members
            if rules:
                SegmentEngine._evaluate_rules(conn, segment_id, company_id, rules)
                conn.commit()

            return {
                "id": segment_id,
                "name": name,
                "type": segment_type,
                "status": "active",
                "message": "Segment created successfully",
            }
        except Exception as e:
            return {"error": str(e)}
        finally:
            conn.close()

    @staticmethod
    def _evaluate_rules(conn: sqlite3.Connection, segment_id: str, company_id: str, rules: List[Dict]):
        """Evaluate rule-based segment membership."""
        # Build query conditions from rules
        conditions = []
        params = [company_id]

        for rule in rules:
            field = rule.get("field", "")
            operator = rule.get("operator", "=")
            value = rule.get("value", "")

            field_map = {
                "total_revenue": "SUM(i.grand_total)",
                "order_count": "COUNT(*)",
                "last_order_days": "JULIANDAY('now') - JULIANDAY(MAX(i.date))",
                "avg_order_value": "AVG(i.grand_total)",
            }

            if field in field_map:
                sql_field = field_map[field]
                op_map = {">=": ">=", "<=": "<=", ">": ">", "<": "<", "=": "=", "!=": "!="}
                sql_op = op_map.get(operator, ">=")
                conditions.append(f"HAVING {sql_field} {sql_op} ?")
                params.append(float(value))

        having_clause = " ".join(conditions) if conditions else "HAVING COUNT(*) >= 1"
        query = f"""
            SELECT i.customer_id, COUNT(*) as freq, SUM(i.grand_total) as total
            FROM invoices i
            WHERE i.company_id = ?
            GROUP BY i.customer_id
            {having_clause}
        """

        try:
            rows = conn.execute(query, params).fetchall()
            for row in rows:
                conn.execute("""
                    INSERT OR REPLACE INTO segment_members (segment_id, customer_id, score, metadata_json)
                    VALUES (?, ?, ?, ?)
                """, (
                    segment_id, row[0], float(row[2] or 0),
                    json.dumps({"frequency": row[1], "total_revenue": float(row[2] or 0)}),
                ))
        except Exception as e:
            print(f"Rule evaluation error: {e}")

    @staticmethod
    def list_segments(company_id: str) -> List[Dict[str, Any]]:
        """List all segments for a company."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            segments = conn.execute("""
                SELECT s.*, 
                       (SELECT COUNT(*) FROM segment_members sm WHERE sm.segment_id = s.id) as member_count,
                       (SELECT SUM(sm.score) FROM segment_members sm WHERE sm.segment_id = s.id) as total_revenue
                FROM segments s
                WHERE s.company_id = ? AND s.status = 'active'
                ORDER BY s.created_at DESC
            """, (company_id,)).fetchall()
            return [dict(s) for s in segments]
        finally:
            conn.close()

    @staticmethod
    def get_segment_details(segment_id: str, company_id: str) -> Dict[str, Any]:
        """Get full details of a segment including members and insights."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            seg = conn.execute(
                "SELECT * FROM segments WHERE id = ? AND company_id = ?",
                (segment_id, company_id)
            ).fetchone()
            if not seg:
                return {"error": "Segment not found"}

            members = conn.execute("""
                SELECT sm.customer_id, sm.score, sm.metadata_json, sm.added_at,
                       c.name as customer_name, c.email as customer_email
                FROM segment_members sm
                LEFT JOIN customers c ON c.id = sm.customer_id OR CAST(c.id AS TEXT) = sm.customer_id
                WHERE sm.segment_id = ?
                ORDER BY sm.score DESC
            """, (segment_id,)).fetchall()

            member_list = []
            total_revenue = 0
            for m in members:
                rev = float(m["score"] or 0)
                total_revenue += rev
                member_list.append({
                    "customer_id": m["customer_id"],
                    "customer_name": m["customer_name"] or m["customer_id"],
                    "customer_email": m["customer_email"] or "",
                    "revenue": round(rev, 2),
                    "metadata": json.loads(m["metadata_json"] or "{}"),
                    "added_at": m["added_at"],
                })

            # Get triggers
            triggers = conn.execute(
                "SELECT * FROM segment_triggers WHERE segment_id = ?",
                (segment_id,)
            ).fetchall()

            return {
                **dict(seg),
                "rules": json.loads(seg["rules_json"] or "[]"),
                "members": member_list,
                "member_count": len(member_list),
                "total_revenue": round(total_revenue, 2),
                "avg_revenue": round(total_revenue / max(len(member_list), 1), 2),
                "triggers": [dict(t) for t in triggers],
            }
        finally:
            conn.close()

    @staticmethod
    def update_segment(segment_id: str, company_id: str, data: Dict) -> Dict[str, Any]:
        """Update segment properties."""
        conn = sqlite3.connect(DB_PATH)
        try:
            updates = []
            params = []
            for key in ["name", "description", "status"]:
                if key in data:
                    updates.append(f"{key} = ?")
                    params.append(data[key])
            if "rules" in data:
                updates.append("rules_json = ?")
                params.append(json.dumps(data["rules"]))
            if "auto_refresh" in data:
                updates.append("auto_refresh = ?")
                params.append(1 if data["auto_refresh"] else 0)

            updates.append("updated_at = CURRENT_TIMESTAMP")
            updates.append("version = version + 1")
            params.extend([segment_id, company_id])

            conn.execute(
                f"UPDATE segments SET {', '.join(updates)} WHERE id = ? AND company_id = ?",
                params,
            )
            conn.commit()

            # Re-evaluate rules if updated
            if "rules" in data:
                conn.execute("DELETE FROM segment_members WHERE segment_id = ?", (segment_id,))
                SegmentEngine._evaluate_rules(conn, segment_id, company_id, data["rules"])
                conn.commit()

            return {"status": "updated", "segment_id": segment_id}
        finally:
            conn.close()

    @staticmethod
    def delete_segment(segment_id: str, company_id: str) -> Dict[str, Any]:
        """Archive a segment."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                "UPDATE segments SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                (segment_id, company_id)
            )
            conn.commit()
            return {"status": "archived", "segment_id": segment_id}
        finally:
            conn.close()

    # ---- RFM SEGMENTATION (Auto-Create) ----
    @staticmethod
    def create_rfm_segments(company_id: str, created_by: int = 1) -> Dict[str, Any]:
        """Auto-create RFM-based segments."""
        rfm_data = SegmentEngine.compute_rfm(company_id)
        if not rfm_data:
            return {"status": "no_data", "message": "No customer data for RFM analysis"}

        # Group by segment label
        groups = defaultdict(list)
        for d in rfm_data:
            groups[d["segment"]].append(d)

        created_segments = []
        conn = sqlite3.connect(DB_PATH)
        try:
            for seg_name, members in groups.items():
                seg_id = f"RFM-{hashlib.md5(f'{company_id}{seg_name}'.encode()).hexdigest()[:8].upper()}"

                # Upsert segment
                conn.execute("""
                    INSERT OR REPLACE INTO segments (id, company_id, name, description, type, status, auto_refresh, created_by)
                    VALUES (?, ?, ?, ?, 'rfm', 'active', 1, ?)
                """, (seg_id, company_id, seg_name, f"RFM auto-segment: {seg_name}", created_by))

                # Clear and re-populate members
                conn.execute("DELETE FROM segment_members WHERE segment_id = ?", (seg_id,))
                for m in members:
                    conn.execute("""
                        INSERT INTO segment_members (segment_id, customer_id, score, metadata_json)
                        VALUES (?, ?, ?, ?)
                    """, (
                        seg_id, m["customer_id"], m["monetary"],
                        json.dumps({"r": m["r_score"], "f": m["f_score"], "m": m["m_score"], "rfm": m["rfm_score"]}),
                    ))

                # Snapshot
                total_rev = sum(m["monetary"] for m in members)
                avg_ov = total_rev / max(len(members), 1)
                conn.execute("""
                    INSERT INTO segment_snapshots (segment_id, snapshot_date, member_count, total_revenue, avg_order_value)
                    VALUES (?, ?, ?, ?, ?)
                """, (seg_id, datetime.now().strftime("%Y-%m-%d"), len(members), total_rev, avg_ov))

                created_segments.append({
                    "id": seg_id,
                    "name": seg_name,
                    "member_count": len(members),
                    "total_revenue": round(total_rev, 2),
                })

            conn.commit()
            return {
                "status": "success",
                "segments_created": len(created_segments),
                "segments": created_segments,
                "total_customers_segmented": len(rfm_data),
            }
        finally:
            conn.close()

    # ---- SEGMENT INSIGHTS DASHBOARD ----
    @staticmethod
    def get_segment_insights(company_id: str) -> Dict[str, Any]:
        """Get aggregated insights across all segments."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            segments = conn.execute("""
                SELECT s.id, s.name, s.type,
                       COUNT(sm.id) as member_count,
                       COALESCE(SUM(sm.score), 0) as total_revenue,
                       COALESCE(AVG(sm.score), 0) as avg_revenue
                FROM segments s
                LEFT JOIN segment_members sm ON sm.segment_id = s.id
                WHERE s.company_id = ? AND s.status = 'active'
                GROUP BY s.id
                ORDER BY total_revenue DESC
            """, (company_id,)).fetchall()

            total_rev_all = sum(float(s["total_revenue"]) for s in segments)
            total_members = sum(int(s["member_count"]) for s in segments)

            segment_insights = []
            for s in segments:
                rev = float(s["total_revenue"])
                pct = (rev / total_rev_all * 100) if total_rev_all > 0 else 0
                segment_insights.append({
                    "id": s["id"],
                    "name": s["name"],
                    "type": s["type"],
                    "member_count": s["member_count"],
                    "total_revenue": round(rev, 2),
                    "avg_revenue": round(float(s["avg_revenue"]), 2),
                    "revenue_contribution_pct": round(pct, 1),
                    "growth_trend": "up" if pct > 20 else "stable" if pct > 5 else "down",
                    "risk_level": "low" if pct > 15 else "medium" if pct > 5 else "high",
                })

            return {
                "total_segments": len(segments),
                "total_customers": total_members,
                "total_revenue": round(total_rev_all, 2),
                "segments": segment_insights,
                "top_segment": segment_insights[0]["name"] if segment_insights else "N/A",
                "risk_segments": [s for s in segment_insights if s["risk_level"] == "high"],
            }
        finally:
            conn.close()

    # ---- SEGMENT TRIGGERS ----
    @staticmethod
    def create_trigger(
        segment_id: str,
        trigger_type: str,
        action_type: str,
        action_config: Dict = None,
    ) -> Dict[str, Any]:
        """Create an automation trigger for a segment."""
        trigger_id = f"TRG-{uuid.uuid4().hex[:8].upper()}"
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO segment_triggers (id, segment_id, trigger_type, action_type, action_config)
                VALUES (?, ?, ?, ?, ?)
            """, (trigger_id, segment_id, trigger_type, action_type, json.dumps(action_config or {})))
            conn.commit()
            return {"id": trigger_id, "status": "created"}
        finally:
            conn.close()

    # ---- SEGMENT-BASED DOCUMENT GENERATION ----
    @staticmethod
    def get_segment_for_documents(segment_id: str) -> List[Dict[str, Any]]:
        """Get segment members for bulk document generation."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            members = conn.execute("""
                SELECT sm.customer_id, sm.score, sm.metadata_json,
                       c.name, c.email, c.phone, c.address
                FROM segment_members sm
                LEFT JOIN customers c ON c.id = sm.customer_id OR CAST(c.id AS TEXT) = sm.customer_id
                WHERE sm.segment_id = ?
            """, (segment_id,)).fetchall()
            return [dict(m) for m in members]
        finally:
            conn.close()

    # ---- AUTO SEGMENT DETECTION ----
    @staticmethod
    def auto_detect_segments(company_id: str) -> Dict[str, Any]:
        """AI-driven automatic segment detection using data patterns."""
        # First run RFM
        rfm_result = SegmentEngine.create_rfm_segments(company_id)

        # Then run clustering
        cluster_result = SegmentEngine.run_ai_clustering(company_id)

        # Combine results
        return {
            "status": "success",
            "rfm_segments": rfm_result,
            "ai_clusters": cluster_result,
            "recommendation": "RFM segments are ready. Review AI clusters for deeper patterns.",
        }
