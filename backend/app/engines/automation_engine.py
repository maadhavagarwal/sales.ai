"""
Automation & Workflow Engine — Full Production Implementation
Provides: Event-Driven Triggers, Segment-Based Automation, Auto Document Generation,
Scheduled Workflows, Alert & Notification Engine.
"""

import json
import sqlite3
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.database_manager import DB_PATH


# ---------- SCHEMA ----------
_AUTOMATION_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    trigger_type TEXT NOT NULL,           -- event | schedule | segment | manual
    trigger_config TEXT DEFAULT '{}',
    actions_json TEXT DEFAULT '[]',
    conditions_json TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active',         -- active | paused | archived
    priority INTEGER DEFAULT 5,
    max_runs INTEGER DEFAULT -1,          -- -1 = unlimited
    run_count INTEGER DEFAULT 0,
    last_run TEXT,
    next_run TEXT,
    created_by INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    status TEXT DEFAULT 'running',        -- running | completed | failed | skipped
    trigger_data TEXT DEFAULT '{}',
    actions_executed TEXT DEFAULT '[]',
    result_json TEXT DEFAULT '{}',
    error_message TEXT,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    duration_ms INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS automation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT DEFAULT '{}',
    source TEXT DEFAULT 'system',
    processed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,             -- info | warning | critical | success
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    source TEXT DEFAULT 'system',
    entity_type TEXT,                     -- invoice | customer | inventory | segment
    entity_id TEXT,
    read_status INTEGER DEFAULT 0,        -- 0 unread, 1 read
    action_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT NOT NULL,
    user_id INTEGER,
    channel TEXT DEFAULT 'in_app',        -- in_app | email | webhook
    alert_types TEXT DEFAULT '["critical","warning"]',
    enabled INTEGER DEFAULT 1,
    config_json TEXT DEFAULT '{}',
    UNIQUE(company_id, user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_wf_company ON workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_wfe_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_event_company ON automation_events(company_id, event_type);
CREATE INDEX IF NOT EXISTS idx_alert_company ON alerts(company_id, read_status);
"""


def _init_automation_tables():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(_AUTOMATION_TABLES_SQL)
    conn.commit()
    conn.close()


try:
    _init_automation_tables()
except Exception:
    pass


class AutomationEngine:
    """Full-featured Automation & Workflow Engine."""

    # ==================== WORKFLOW MANAGEMENT ====================

    @staticmethod
    def create_workflow(
        company_id: str,
        name: str,
        trigger_type: str,
        trigger_config: Dict = None,
        actions: List[Dict] = None,
        conditions: List[Dict] = None,
        description: str = "",
        priority: int = 5,
        created_by: int = 1,
    ) -> Dict[str, Any]:
        """Create a new automation workflow."""
        wf_id = f"WF-{uuid.uuid4().hex[:8].upper()}"

        # Calculate next_run for scheduled workflows
        next_run = None
        if trigger_type == "schedule":
            freq = (trigger_config or {}).get("frequency", "daily")
            freq_map = {"hourly": 1/24, "daily": 1, "weekly": 7, "monthly": 30}
            days = freq_map.get(freq, 1)
            next_run = (datetime.now() + timedelta(days=days)).isoformat()

        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO workflows (id, company_id, name, description, trigger_type, trigger_config,
                    actions_json, conditions_json, priority, next_run, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                wf_id, company_id, name, description, trigger_type,
                json.dumps(trigger_config or {}),
                json.dumps(actions or []),
                json.dumps(conditions or []),
                priority, next_run, created_by,
            ))
            conn.commit()
            return {"id": wf_id, "name": name, "status": "active", "trigger_type": trigger_type, "next_run": next_run}
        except Exception as e:
            return {"error": str(e)}
        finally:
            conn.close()

    @staticmethod
    def list_workflows(company_id: str) -> List[Dict[str, Any]]:
        """List all workflows for a company."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute("""
                SELECT w.*,
                       (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) as total_executions,
                       (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id AND we.status='completed') as successful_executions
                FROM workflows w
                WHERE w.company_id = ? AND w.status != 'archived'
                ORDER BY w.priority ASC, w.created_at DESC
            """, (company_id,)).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    @staticmethod
    def get_workflow(workflow_id: str, company_id: str) -> Dict[str, Any]:
        """Get workflow details with execution history."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            wf = conn.execute(
                "SELECT * FROM workflows WHERE id=? AND company_id=?", (workflow_id, company_id)
            ).fetchone()
            if not wf:
                return {"error": "Workflow not found"}

            executions = conn.execute("""
                SELECT * FROM workflow_executions WHERE workflow_id=?
                ORDER BY started_at DESC LIMIT 20
            """, (workflow_id,)).fetchall()

            wf_dict = dict(wf)
            wf_dict["actions"] = json.loads(wf_dict.get("actions_json", "[]"))
            wf_dict["conditions"] = json.loads(wf_dict.get("conditions_json", "[]"))
            wf_dict["trigger_config"] = json.loads(wf_dict.get("trigger_config", "{}"))
            wf_dict["executions"] = [dict(e) for e in executions]

            return wf_dict
        finally:
            conn.close()

    @staticmethod
    def update_workflow(workflow_id: str, company_id: str, data: Dict) -> Dict:
        """Update a workflow."""
        conn = sqlite3.connect(DB_PATH)
        try:
            updates = []
            params = []
            for key in ["name", "description", "status", "priority"]:
                if key in data:
                    updates.append(f"{key} = ?")
                    params.append(data[key])
            if "trigger_config" in data:
                updates.append("trigger_config = ?")
                params.append(json.dumps(data["trigger_config"]))
            if "actions" in data:
                updates.append("actions_json = ?")
                params.append(json.dumps(data["actions"]))
            if "conditions" in data:
                updates.append("conditions_json = ?")
                params.append(json.dumps(data["conditions"]))

            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.extend([workflow_id, company_id])

            conn.execute(f"UPDATE workflows SET {', '.join(updates)} WHERE id=? AND company_id=?", params)
            conn.commit()
            return {"status": "updated", "workflow_id": workflow_id}
        finally:
            conn.close()

    @staticmethod
    def delete_workflow(workflow_id: str, company_id: str) -> Dict:
        """Archive a workflow."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                "UPDATE workflows SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?",
                (workflow_id, company_id)
            )
            conn.commit()
            return {"status": "archived", "workflow_id": workflow_id}
        finally:
            conn.close()

    # ==================== EVENT PROCESSING ====================

    @staticmethod
    def emit_event(company_id: str, event_type: str, event_data: Dict = None, source: str = "system") -> Dict:
        """Emit a business event that can trigger workflows."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO automation_events (company_id, event_type, event_data, source)
                VALUES (?, ?, ?, ?)
            """, (company_id, event_type, json.dumps(event_data or {}), source))
            event_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            conn.commit()

            # Process matching workflows
            triggered = AutomationEngine._process_event(conn, company_id, event_type, event_data or {})

            return {
                "event_id": event_id,
                "event_type": event_type,
                "workflows_triggered": triggered,
            }
        finally:
            conn.close()

    @staticmethod
    def _process_event(conn, company_id: str, event_type: str, event_data: Dict) -> int:
        """Process an event and trigger matching workflows."""
        workflows = conn.execute("""
            SELECT * FROM workflows
            WHERE company_id=? AND trigger_type='event' AND status='active'
        """, (company_id,)).fetchall()

        triggered = 0
        for wf in workflows:
            wf_dict = dict(wf) if hasattr(wf, "keys") else {
                "id": wf[0], "trigger_config": wf[5], "actions_json": wf[6],
                "conditions_json": wf[7], "max_runs": wf[10], "run_count": wf[11],
            }
            config = json.loads(wf_dict.get("trigger_config", "{}") or "{}")

            # Check if event matches trigger config
            trigger_events = config.get("events", [])
            if trigger_events and event_type not in trigger_events:
                continue

            # Check max runs
            max_runs = wf_dict.get("max_runs", -1)
            run_count = wf_dict.get("run_count", 0)
            if max_runs > 0 and run_count >= max_runs:
                continue

            # Execute workflow
            AutomationEngine._execute_workflow(conn, wf_dict, company_id, event_data)
            triggered += 1

        return triggered

    @staticmethod
    def _execute_workflow(conn, workflow: Dict, company_id: str, trigger_data: Dict) -> Dict:
        """Execute a workflow's actions."""
        exec_id = f"EXE-{uuid.uuid4().hex[:8].upper()}"
        wf_id = workflow.get("id", "")
        start_time = datetime.now()
        actions_executed = []
        error_msg = None

        try:
            actions = json.loads(workflow.get("actions_json", "[]") or "[]")

            for action in actions:
                action_type = action.get("type", "")
                action_config = action.get("config", {})
                result = AutomationEngine._execute_action(
                    conn, company_id, action_type, action_config, trigger_data
                )
                actions_executed.append({
                    "type": action_type,
                    "status": "completed" if "error" not in result else "failed",
                    "result": result,
                })

            status = "completed"
        except Exception as e:
            status = "failed"
            error_msg = str(e)

        duration = int((datetime.now() - start_time).total_seconds() * 1000)

        # Log execution
        try:
            conn.execute("""
                INSERT INTO workflow_executions (id, workflow_id, company_id, status, trigger_data, actions_executed, result_json, error_message, duration_ms, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                exec_id, wf_id, company_id, status,
                json.dumps(trigger_data), json.dumps(actions_executed),
                json.dumps({"actions_count": len(actions_executed)}),
                error_msg, duration, datetime.now().isoformat(),
            ))

            # Update workflow run count
            conn.execute(
                "UPDATE workflows SET run_count = run_count + 1, last_run = ? WHERE id = ?",
                (datetime.now().isoformat(), wf_id)
            )
            conn.commit()
        except Exception:
            pass

        return {"execution_id": exec_id, "status": status, "actions_executed": len(actions_executed)}

    @staticmethod
    def _execute_action(conn, company_id: str, action_type: str, config: Dict, trigger_data: Dict) -> Dict:
        """Execute a single workflow action."""
        if action_type == "send_alert":
            return AutomationEngine.create_alert(
                company_id=company_id,
                alert_type=config.get("alert_type", "info"),
                title=config.get("title", "Automation Alert"),
                message=config.get("message", "").format(**trigger_data) if trigger_data else config.get("message", ""),
                source="automation",
            )

        elif action_type == "generate_document":
            try:
                from app.engines.document_engine import DocumentEngine
                return DocumentEngine.generate_document(
                    company_id=company_id,
                    doc_type=config.get("doc_type", "sales_report"),
                    title=config.get("title", "Auto-Generated Report"),
                    data=trigger_data,
                )
            except Exception as e:
                return {"error": str(e)}

        elif action_type == "update_segment":
            try:
                from app.engines.segment_engine import SegmentEngine
                return SegmentEngine.create_rfm_segments(company_id)
            except Exception as e:
                return {"error": str(e)}

        elif action_type == "send_email":
            try:
                from app.services.integration_service import IntegrationService
                IntegrationService.send_email(
                    config.get("to", ""),
                    config.get("subject", "NeuralBI Notification"),
                    config.get("body", "Automated notification from NeuralBI"),
                )
                return {"status": "sent", "to": config.get("to")}
            except Exception as e:
                return {"error": str(e)}

        elif action_type == "webhook":
            try:
                import urllib.request
                req = urllib.request.Request(
                    config.get("url", ""),
                    data=json.dumps(trigger_data).encode(),
                    headers={"Content-Type": "application/json"},
                )
                urllib.request.urlopen(req, timeout=10)
                return {"status": "sent", "url": config.get("url")}
            except Exception as e:
                return {"error": str(e)}

        elif action_type == "log":
            from app.core.database_manager import log_activity
            log_activity(0, config.get("action", "AUTOMATION"), config.get("module", "WORKFLOW"),
                        details=trigger_data)
            return {"status": "logged"}

        return {"status": "unknown_action", "type": action_type}

    # ==================== ALERTS & NOTIFICATIONS ====================

    @staticmethod
    def create_alert(
        company_id: str,
        alert_type: str,
        title: str,
        message: str = "",
        source: str = "system",
        entity_type: str = None,
        entity_id: str = None,
        action_url: str = None,
        expires_days: int = 30,
    ) -> Dict[str, Any]:
        """Create a new alert/notification."""
        alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
        expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat()

        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT INTO alerts (id, company_id, alert_type, title, message, source,
                    entity_type, entity_id, action_url, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert_id, company_id, alert_type, title, message,
                source, entity_type, entity_id, action_url, expires_at,
            ))
            conn.commit()
            return {"id": alert_id, "alert_type": alert_type, "title": title, "status": "created"}
        finally:
            conn.close()

    @staticmethod
    def list_alerts(company_id: str, unread_only: bool = False, limit: int = 50) -> List[Dict]:
        """List alerts for a company."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            query = "SELECT * FROM alerts WHERE company_id=?"
            params = [company_id]
            if unread_only:
                query += " AND read_status=0"
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            return [dict(r) for r in conn.execute(query, params).fetchall()]
        finally:
            conn.close()

    @staticmethod
    def mark_alert_read(alert_id: str, company_id: str) -> Dict:
        """Mark an alert as read."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                "UPDATE alerts SET read_status=1 WHERE id=? AND company_id=?",
                (alert_id, company_id)
            )
            conn.commit()
            return {"status": "read", "alert_id": alert_id}
        finally:
            conn.close()

    @staticmethod
    def mark_all_read(company_id: str) -> Dict:
        """Mark all alerts as read."""
        conn = sqlite3.connect(DB_PATH)
        try:
            result = conn.execute(
                "UPDATE alerts SET read_status=1 WHERE company_id=? AND read_status=0",
                (company_id,)
            )
            conn.commit()
            return {"status": "all_read", "count": result.rowcount}
        finally:
            conn.close()

    @staticmethod
    def get_alert_summary(company_id: str) -> Dict:
        """Get alert summary statistics."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            total = conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE company_id=?", (company_id,)
            ).fetchone()[0]
            unread = conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE company_id=? AND read_status=0", (company_id,)
            ).fetchone()[0]
            critical = conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE company_id=? AND alert_type='critical' AND read_status=0", (company_id,)
            ).fetchone()[0]
            warning = conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE company_id=? AND alert_type='warning' AND read_status=0", (company_id,)
            ).fetchone()[0]

            return {
                "total": total,
                "unread": unread,
                "critical": critical,
                "warnings": warning,
                "info": unread - critical - warning,
            }
        finally:
            conn.close()

    # ==================== SCHEDULED WORKFLOWS ====================

    @staticmethod
    def get_due_workflows(company_id: str = None) -> List[Dict]:
        """Get workflows that are due to run."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            now = datetime.now().isoformat()
            query = """
                SELECT * FROM workflows
                WHERE trigger_type='schedule' AND status='active' AND next_run <= ?
            """
            params = [now]
            if company_id:
                query += " AND company_id=?"
                params.append(company_id)

            return [dict(r) for r in conn.execute(query, params).fetchall()]
        finally:
            conn.close()

    @staticmethod
    def run_scheduled_workflows() -> Dict:
        """Process all due scheduled workflows."""
        due = AutomationEngine.get_due_workflows()
        results = []

        for wf in due:
            conn = sqlite3.connect(DB_PATH)
            try:
                result = AutomationEngine._execute_workflow(
                    conn, wf, wf["company_id"], {"trigger": "schedule", "time": datetime.now().isoformat()}
                )

                # Calculate next run
                config = json.loads(wf.get("trigger_config", "{}") or "{}")
                freq = config.get("frequency", "daily")
                freq_map = {"hourly": 1/24, "daily": 1, "weekly": 7, "monthly": 30}
                days = freq_map.get(freq, 1)
                next_run = (datetime.now() + timedelta(days=days)).isoformat()

                conn.execute("UPDATE workflows SET next_run=? WHERE id=?", (next_run, wf["id"]))
                conn.commit()

                results.append({**result, "workflow_id": wf["id"], "next_run": next_run})
            finally:
                conn.close()

        return {"processed": len(results), "results": results}

    # ==================== PRE-BUILT AUTOMATION TEMPLATES ====================

    @staticmethod
    def create_preset_workflows(company_id: str, created_by: int = 1) -> Dict:
        """Create a set of recommended automation workflows."""
        presets = [
            {
                "name": "Low Stock Alert",
                "description": "Alert when inventory falls below reorder point",
                "trigger_type": "event",
                "trigger_config": {"events": ["inventory_update", "order_placed"]},
                "actions": [
                    {"type": "send_alert", "config": {
                        "alert_type": "warning",
                        "title": "Low Stock Warning",
                        "message": "Inventory level is below reorder threshold",
                    }},
                ],
            },
            {
                "name": "New Customer Welcome",
                "description": "Send welcome email when a new customer is added",
                "trigger_type": "event",
                "trigger_config": {"events": ["customer_created"]},
                "actions": [
                    {"type": "send_alert", "config": {
                        "alert_type": "success",
                        "title": "New Customer Added",
                        "message": "A new customer has been added to the system",
                    }},
                ],
            },
            {
                "name": "Monthly Sales Report",
                "description": "Auto-generate and email monthly sales report",
                "trigger_type": "schedule",
                "trigger_config": {"frequency": "monthly"},
                "actions": [
                    {"type": "generate_document", "config": {
                        "doc_type": "sales_report",
                        "title": "Monthly Sales Summary",
                    }},
                    {"type": "send_alert", "config": {
                        "alert_type": "info",
                        "title": "Monthly Report Generated",
                        "message": "Your monthly sales report is ready for review",
                    }},
                ],
            },
            {
                "name": "Churn Risk Monitor",
                "description": "Weekly check for at-risk customers",
                "trigger_type": "schedule",
                "trigger_config": {"frequency": "weekly"},
                "actions": [
                    {"type": "update_segment", "config": {}},
                    {"type": "send_alert", "config": {
                        "alert_type": "warning",
                        "title": "Churn Risk Update",
                        "message": "Weekly customer segments have been refreshed",
                    }},
                ],
            },
            {
                "name": "Invoice Overdue Alert",
                "description": "Alert on overdue invoices",
                "trigger_type": "event",
                "trigger_config": {"events": ["invoice_overdue"]},
                "actions": [
                    {"type": "send_alert", "config": {
                        "alert_type": "critical",
                        "title": "Overdue Invoice",
                        "message": "An invoice is past due date",
                    }},
                ],
            },
            {
                "name": "Daily Financial Snapshot",
                "description": "Generate daily financial health check",
                "trigger_type": "schedule",
                "trigger_config": {"frequency": "daily"},
                "actions": [
                    {"type": "log", "config": {"action": "DAILY_SNAPSHOT", "module": "FINANCE"}},
                    {"type": "send_alert", "config": {
                        "alert_type": "info",
                        "title": "Daily Financial Update",
                        "message": "Your daily financial status has been recorded",
                    }},
                ],
            },
        ]

        created = []
        for preset in presets:
            result = AutomationEngine.create_workflow(
                company_id=company_id,
                name=preset["name"],
                description=preset["description"],
                trigger_type=preset["trigger_type"],
                trigger_config=preset["trigger_config"],
                actions=preset["actions"],
                created_by=created_by,
            )
            created.append(result)

        return {
            "status": "success",
            "workflows_created": len(created),
            "workflows": created,
        }

    # ==================== NOTIFICATION PREFERENCES ====================

    @staticmethod
    def set_notification_preferences(
        company_id: str, user_id: int, channel: str, alert_types: List[str], config: Dict = None
    ) -> Dict:
        """Set notification preferences for a user."""
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("""
                INSERT OR REPLACE INTO notification_preferences (company_id, user_id, channel, alert_types, config_json)
                VALUES (?, ?, ?, ?, ?)
            """, (company_id, user_id, channel, json.dumps(alert_types), json.dumps(config or {})))
            conn.commit()
            return {"status": "saved", "channel": channel}
        finally:
            conn.close()

    @staticmethod
    def get_notification_preferences(company_id: str, user_id: int) -> List[Dict]:
        """Get notification preferences for a user."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            return [dict(r) for r in conn.execute(
                "SELECT * FROM notification_preferences WHERE company_id=? AND user_id=?",
                (company_id, user_id)
            ).fetchall()]
        finally:
            conn.close()
