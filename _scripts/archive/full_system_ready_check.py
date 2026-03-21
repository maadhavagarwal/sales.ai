import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.system_readiness import evaluate_full_system_readiness


def main() -> int:
    status = evaluate_full_system_readiness(company_id=None, registered_routes=[])
    print(json.dumps(status, indent=2))
    return 0 if status.get("overall") == "READY" else 1


if __name__ == "__main__":
    raise SystemExit(main())
