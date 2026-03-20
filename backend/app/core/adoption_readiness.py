import json
import os
import shutil
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.database_manager import DB_PATH
from app.core.system_readiness import evaluate_full_system_readiness


@dataclass
class ParityResult:
    domain: str
    source_count: int
    target_count: int
    delta: int
    ok: bool


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _utcnow().isoformat()


def _workspace_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _read_env_file(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return values

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        k = key.strip()
        v = val.strip().strip('"').strip("'")
        if k:
            values[k] = v
    return values


def _config_value(*keys: str) -> str:
    for key in keys:
        v = os.getenv(key)
        if v:
            return str(v)

    root = _workspace_root()
    env_candidates = [
        root / ".env",
        root / ".env.local",
        root / ".env.advanced",
        root / "backend" / ".env",
    ]
    for env_file in env_candidates:
        if not env_file.exists():
            continue
        data = _read_env_file(env_file)
        for key in keys:
            val = data.get(key)
            if val:
                return str(val)
    return ""


def _backups_dir() -> Path:
    p = _workspace_root() / "backend" / "data" / "backups"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _drill_log_path() -> Path:
    return _backups_dir() / "backup_drills.jsonl"


def _table_count(conn: sqlite3.Connection, table: str, company_id: Optional[str]) -> int:
    cur = conn.cursor()
    try:
        if company_id:
            cur.execute(f"SELECT COUNT(*) FROM {table} WHERE company_id = ?", (company_id,))
        else:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
        val = cur.fetchone()
        return int(val[0]) if val else 0
    except Exception:
        return 0


def _collect_domain_counts(company_id: Optional[str]) -> Dict[str, int]:
    conn = sqlite3.connect(DB_PATH)
    try:
        return {
            "customers": _table_count(conn, "customers", company_id),
            "invoices": _table_count(conn, "invoices", company_id),
            "inventory": _table_count(conn, "inventory", company_id),
            "ledger": _table_count(conn, "ledger", company_id),
            "deals": _table_count(conn, "deals", company_id),
            "marketing_campaigns": _table_count(conn, "marketing_campaigns", company_id),
            "personnel": _table_count(conn, "personnel", company_id),
            "expenses": _table_count(conn, "expenses", company_id),
        }
    finally:
        conn.close()


def run_data_parity_check(
    company_id: Optional[str],
    source_counts: Dict[str, Any],
    tolerance: int = 0,
) -> Dict[str, Any]:
    target_counts = _collect_domain_counts(company_id)
    parity: List[ParityResult] = []

    for domain, src in source_counts.items():
        try:
            src_count = int(src)
        except Exception:
            src_count = 0
        tgt_count = int(target_counts.get(domain, 0))
        delta = tgt_count - src_count
        ok = abs(delta) <= max(0, tolerance)
        parity.append(
            ParityResult(
                domain=domain,
                source_count=src_count,
                target_count=tgt_count,
                delta=delta,
                ok=ok,
            )
        )

    passed = len([p for p in parity if p.ok])
    total = len(parity)
    overall = "PASS" if passed == total else "FAIL"

    return {
        "overall": overall,
        "tolerance": tolerance,
        "company_id": company_id,
        "passed": passed,
        "failed": total - passed,
        "results": [
            {
                "domain": p.domain,
                "source_count": p.source_count,
                "target_count": p.target_count,
                "delta": p.delta,
                "ok": p.ok,
            }
            for p in parity
        ],
    }


def build_go_live_confidence_report(
    company_id: Optional[str],
    registered_routes: Optional[List[str]],
    source_counts: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    readiness = evaluate_full_system_readiness(company_id, registered_routes)
    counts = _collect_domain_counts(company_id)

    adoption_signals: List[Dict[str, Any]] = [
        {
            "name": "full_system_readiness",
            "ok": readiness.get("overall") == "READY",
            "weight": 45,
            "details": f"overall={readiness.get('overall')} score={readiness.get('score')}",
        },
        {
            "name": "core_business_data_present",
            "ok": all(counts.get(k, 0) > 0 for k in ["customers", "invoices", "inventory", "ledger", "personnel"]),
            "weight": 25,
            "details": "core business modules have operational records",
        },
        {
            "name": "commercial_activity_present",
            "ok": counts.get("deals", 0) > 0 or counts.get("marketing_campaigns", 0) > 0,
            "weight": 15,
            "details": "at least one pipeline or campaign record exists",
        },
        {
            "name": "financial_tracking_present",
            "ok": counts.get("expenses", 0) > 0 and counts.get("ledger", 0) > 0,
            "weight": 15,
            "details": "expense and ledger records indicate active finance operations",
        },
    ]

    parity_summary = None
    if source_counts:
        parity_summary = run_data_parity_check(company_id, source_counts, tolerance=0)
        parity_ok = parity_summary.get("overall") == "PASS"
        adoption_signals.append(
            {
                "name": "source_target_parity",
                "ok": parity_ok,
                "weight": 20,
                "details": "source and target record counts are in parity",
            }
        )

    max_weight = sum(int(s["weight"]) for s in adoption_signals)
    earned_weight = sum(int(s["weight"]) for s in adoption_signals if bool(s["ok"]))
    confidence_score = round((earned_weight / max(1, max_weight)) * 100, 2)

    confidence_level = "HIGH"
    if confidence_score < 85:
        confidence_level = "MEDIUM"
    if confidence_score < 70:
        confidence_level = "LOW"

    blockers = [s["name"] for s in adoption_signals if not bool(s["ok"])]

    return {
        "generated_at": _iso_now(),
        "company_id": company_id,
        "confidence_score": confidence_score,
        "confidence_level": confidence_level,
        "overall": "GO" if confidence_score >= 85 else "HOLD",
        "signals": adoption_signals,
        "data_counts": counts,
        "system_readiness": {
            "overall": readiness.get("overall"),
            "score": readiness.get("score"),
            "blockers": readiness.get("blockers", []),
        },
        "parity": parity_summary,
        "blockers": blockers,
    }


def evaluate_migration_verification(
    company_id: Optional[str],
    registered_routes: Optional[List[str]],
    source_counts: Optional[Dict[str, Any]],
    tolerance: int,
) -> Dict[str, Any]:
    confidence = build_go_live_confidence_report(company_id, registered_routes, source_counts)
    parity = confidence.get("parity")

    checks = [
        {
            "name": "go_live_confidence",
            "ok": confidence.get("overall") == "GO",
            "details": f"confidence_score={confidence.get('confidence_score')}",
            "severity": "critical",
        },
        {
            "name": "full_system_readiness",
            "ok": confidence.get("system_readiness", {}).get("overall") == "READY",
            "details": f"readiness={confidence.get('system_readiness', {}).get('overall')}",
            "severity": "critical",
        },
    ]

    if source_counts is not None:
        checks.append(
            {
                "name": "data_parity",
                "ok": parity is not None and parity.get("overall") == "PASS",
                "details": f"tolerance={tolerance}",
                "severity": "high",
            }
        )

    failed_critical = [c for c in checks if not c["ok"] and c["severity"] == "critical"]
    failed = [c for c in checks if not c["ok"]]

    overall = "VERIFIED" if not failed else "NOT_VERIFIED"
    gate = "GO" if not failed_critical and confidence.get("confidence_score", 0) >= 85 else "NO_GO"

    return {
        "generated_at": _iso_now(),
        "overall": overall,
        "cutover_gate": gate,
        "checks": checks,
        "failed_checks": [c["name"] for c in failed],
        "confidence": confidence,
        "parity": parity,
    }


def _validate_sqlite_file(path: Path) -> Dict[str, Any]:
    conn = sqlite3.connect(str(path))
    try:
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [str(r[0]) for r in cur.fetchall()]
        required = {"users", "customers", "invoices", "inventory", "ledger"}
        missing = sorted(list(required - set(tables)))
        return {
            "ok": len(missing) == 0,
            "tables": len(tables),
            "missing_required": missing,
        }
    finally:
        conn.close()


def run_backup_restore_drill() -> Dict[str, Any]:
    backup_dir = _backups_dir()
    ts = _utcnow().strftime("%Y%m%dT%H%M%SZ")
    backup_file = backup_dir / f"enterprise_{ts}.db"
    restore_probe_file = backup_dir / f"restore_probe_{ts}.db"

    shutil.copy2(DB_PATH, backup_file)
    backup_validation = _validate_sqlite_file(backup_file)

    shutil.copy2(backup_file, restore_probe_file)
    restore_validation = _validate_sqlite_file(restore_probe_file)

    drill_ok = bool(backup_validation.get("ok")) and bool(restore_validation.get("ok"))

    record = {
        "timestamp": _iso_now(),
        "backup_file": str(backup_file),
        "restore_probe_file": str(restore_probe_file),
        "backup_validation": backup_validation,
        "restore_validation": restore_validation,
        "overall": "PASS" if drill_ok else "FAIL",
    }

    with _drill_log_path().open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    return record


def _read_last_successful_drill() -> Optional[Dict[str, Any]]:
    path = _drill_log_path()
    if not path.exists():
        return None

    last_ok: Optional[Dict[str, Any]] = None
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
                if item.get("overall") == "PASS":
                    last_ok = item
            except Exception:
                continue
    return last_ok


def get_incident_readiness() -> Dict[str, Any]:
    root = _workspace_root()
    runbook_candidates = [
        root / "INCIDENT_RESPONSE_RUNBOOK.md",
        root / "DEPLOYMENT_GUIDE.md",
        root / "MONITORING_SETUP_GUIDE.md",
    ]
    runbooks_present = [str(p.name) for p in runbook_candidates if p.exists()]

    backup_files = sorted(_backups_dir().glob("enterprise_*.db"), key=lambda p: p.stat().st_mtime, reverse=True)
    latest_backup = backup_files[0] if backup_files else None

    backup_age_ok = False
    backup_age_hours: Optional[float] = None
    if latest_backup:
        mtime = datetime.fromtimestamp(latest_backup.stat().st_mtime, tz=timezone.utc)
        backup_age_hours = round((_utcnow() - mtime).total_seconds() / 3600.0, 2)
        backup_age_ok = bool(backup_age_hours <= 24)

    last_drill = _read_last_successful_drill()
    drill_recent_ok = False
    last_drill_age_days: Optional[float] = None
    if last_drill and isinstance(last_drill.get("timestamp"), str):
        try:
            ts = datetime.fromisoformat(last_drill["timestamp"])
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            last_drill_age_days = round((_utcnow() - ts).total_seconds() / 86400.0, 2)
            drill_recent_ok = bool(last_drill_age_days <= 30)
        except Exception:
            drill_recent_ok = False

    oncall_present = bool(_config_value("ONCALL_PRIMARY") or _config_value("ONCALL_ESCALATION"))

    checks = [
        {"name": "runbooks_present", "ok": len(runbooks_present) >= 2, "severity": "high"},
        {"name": "recent_backup", "ok": backup_age_ok, "severity": "critical"},
        {"name": "recent_backup_drill", "ok": drill_recent_ok, "severity": "critical"},
        {"name": "oncall_contacts_configured", "ok": oncall_present, "severity": "medium"},
    ]

    critical_failed = [c for c in checks if not c["ok"] and c["severity"] == "critical"]
    overall = "READY"
    if critical_failed:
        overall = "BLOCKED"
    elif any(not c["ok"] for c in checks):
        overall = "AT_RISK"

    return {
        "generated_at": _iso_now(),
        "overall": overall,
        "checks": checks,
        "runbooks_present": runbooks_present,
        "latest_backup": str(latest_backup) if latest_backup else None,
        "latest_backup_age_hours": backup_age_hours,
        "last_successful_drill": last_drill,
        "last_drill_age_days": last_drill_age_days,
    }
