#!/usr/bin/env python3
"""Direct full-cutover gate check for Sales AI Platform.

Runs static existence checks for critical modules/endpoints/settings required
for finance, marketing, sales, inventory, accounting, HR, and AI reliability.

Exit code:
- 0: all gates passed
- 1: one or more gates failed
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
import sys


ROOT = Path(__file__).resolve().parent


@dataclass
class GateResult:
    gate: str
    ok: bool
    details: str


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def _exists(path: Path) -> bool:
    return path.exists()


def run_checks() -> list[GateResult]:
    results: list[GateResult] = []

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
        "README.md",
        "requirements.txt",
    ]

    missing_files = [p for p in required_files if not _exists(ROOT / p)]
    results.append(
        GateResult(
            gate="core_files_exist",
            ok=not missing_files,
            details="all required files present"
            if not missing_files
            else f"missing: {', '.join(missing_files)}",
        )
    )

    main_py = _read_text(ROOT / "backend/app/main.py") if _exists(ROOT / "backend/app/main.py") else ""
    required_endpoints = [
        '/workspace/hr/stats',
        '/workspace/finance/summary',
        '/workspace/inventory',
        '/workspace/accounting/trial-balance',
        '/workspace/accounting/balance-sheet',
        '/workspace/accounting/daybook',
        '/workspace/marketing/campaigns',
        '/workspace/crm/deals',
        '/workspace/crm/targets/attainment',
    ]
    missing_endpoints = [ep for ep in required_endpoints if ep not in main_py]
    results.append(
        GateResult(
            gate="critical_endpoints_exist",
            ok=not missing_endpoints,
            details="all critical endpoints found"
            if not missing_endpoints
            else f"missing: {', '.join(missing_endpoints)}",
        )
    )

    workspace_content = (
        _read_text(ROOT / "frontend/components/workspace/WorkspaceContent.tsx")
        if _exists(ROOT / "frontend/components/workspace/WorkspaceContent.tsx")
        else ""
    )
    required_sections = ['id: "crm"', 'id: "marketing"', 'id: "inventory"', 'id: "accounts"', 'id: "hr"', 'id: "finance"']
    missing_sections = [s for s in required_sections if s not in workspace_content]
    results.append(
        GateResult(
            gate="workspace_sections_exposed",
            ok=not missing_sections,
            details="workspace navigation exposes all core business modules"
            if not missing_sections
            else f"missing section entries: {', '.join(missing_sections)}",
        )
    )

    readme = _read_text(ROOT / "README.md") if _exists(ROOT / "README.md") else ""
    strict_flags = [
        "NEURALBI_STRICT_PRODUCTION=true",
        "ENABLE_DEMO_SEED_DATA=false",
        "ENABLE_LIVE_KPI_SIMULATOR=false",
    ]
    missing_flags = [f for f in strict_flags if f not in readme]
    results.append(
        GateResult(
            gate="strict_mode_documented",
            ok=not missing_flags,
            details="strict launch flags documented"
            if not missing_flags
            else f"missing in README: {', '.join(missing_flags)}",
        )
    )

    reqs = _read_text(ROOT / "requirements.txt") if _exists(ROOT / "requirements.txt") else ""
    ai_runtime_markers = ["torch", "scikit-learn", "sentence-transformers", "faiss-cpu"]
    missing_ai_markers = [m for m in ai_runtime_markers if m not in reqs]
    results.append(
        GateResult(
            gate="ai_runtime_dependencies_present",
            ok=not missing_ai_markers,
            details="AI/ML dependencies present"
            if not missing_ai_markers
            else f"missing deps markers: {', '.join(missing_ai_markers)}",
        )
    )

    return results


def main() -> int:
    checks = run_checks()
    failed = [c for c in checks if not c.ok]

    summary = {
        "overall": "PASS" if not failed else "FAIL",
        "passed": len(checks) - len(failed),
        "failed": len(failed),
        "checks": [c.__dict__ for c in checks],
    }

    print(json.dumps(summary, indent=2))
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
