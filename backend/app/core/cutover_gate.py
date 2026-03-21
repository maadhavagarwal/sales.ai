from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class GateResult:
    gate: str
    ok: bool
    details: str


ROOT = Path(__file__).resolve().parents[3]


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def run_cutover_checks() -> Dict[str, Any]:
    results: List[GateResult] = []

    required_files = [
        "backend/app/main.py",
        "backend/app/engines/workspace_engine.py",
        "backend/app/engines/hr_engine.py",
        "backend/app/engines/finance_engine.py",
        "frontend/components/workspace/WorkspaceContent.tsx",
        "frontend/components/workspace/WorkspaceCRM.tsx",
        "frontend/components/workspace/WorkspaceMarketing.tsx",
        "frontend/components/workspace/WorkspaceInventory.tsx",
        "frontend/components/workspace/WorkspaceAccounts.tsx",
        "frontend/components/workspace/WorkspaceHR.tsx",
        "frontend/components/workspace/WorkspaceFinance.tsx",
    ]

    missing_files = [p for p in required_files if not (ROOT / p).exists()]
    results.append(
        GateResult(
            gate="core_files_exist",
            ok=not missing_files,
            details=(
                "all required files present"
                if not missing_files
                else f"missing: {', '.join(missing_files)}"
            ),
        )
    )

    main_py_path = ROOT / "backend/app/main.py"
    main_py = _read_text(main_py_path) if main_py_path.exists() else ""
    required_endpoints = [
        "/workspace/hr/stats",
        "/workspace/finance/summary",
        "/workspace/inventory",
        "/workspace/accounting/trial-balance",
        "/workspace/accounting/balance-sheet",
        "/workspace/accounting/daybook",
        "/workspace/marketing/campaigns",
        "/workspace/crm/deals",
        "/workspace/crm/targets/attainment",
    ]
    missing_endpoints = [ep for ep in required_endpoints if ep not in main_py]
    results.append(
        GateResult(
            gate="critical_endpoints_exist",
            ok=not missing_endpoints,
            details=(
                "all critical endpoints found"
                if not missing_endpoints
                else f"missing: {', '.join(missing_endpoints)}"
            ),
        )
    )

    ws_content_path = ROOT / "frontend/components/workspace/WorkspaceContent.tsx"
    ws_content = _read_text(ws_content_path) if ws_content_path.exists() else ""
    required_sections = [
        'id: "crm"',
        'id: "marketing"',
        'id: "inventory"',
        'id: "accounts"',
        'id: "hr"',
        'id: "finance"',
    ]
    missing_sections = [s for s in required_sections if s not in ws_content]
    results.append(
        GateResult(
            gate="workspace_sections_exposed",
            ok=not missing_sections,
            details=(
                "workspace navigation exposes all core business modules"
                if not missing_sections
                else f"missing section entries: {', '.join(missing_sections)}"
            ),
        )
    )

    strict_markers = {
        "NEURALBI_STRICT_PRODUCTION": ROOT / "backend/app/core/strict_mode.py",
        "ENABLE_LIVE_KPI_SIMULATOR": ROOT / "backend/app/main.py",
    }
    strict_missing: List[str] = []
    for marker, marker_file in strict_markers.items():
        content = _read_text(marker_file) if marker_file.exists() else ""
        if marker not in content:
            strict_missing.append(marker)

    results.append(
        GateResult(
            gate="strict_mode_guardrails_present",
            ok=not strict_missing,
            details=(
                "strict production guardrails are implemented in code"
                if not strict_missing
                else f"missing strict guardrails: {', '.join(strict_missing)}"
            ),
        )
    )

    failed = [r for r in results if not r.ok]
    return {
        "overall": "PASS" if not failed else "FAIL",
        "passed": len(results) - len(failed),
        "failed": len(failed),
        "checks": [r.__dict__ for r in results],
    }
