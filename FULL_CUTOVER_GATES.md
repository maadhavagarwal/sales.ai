# Full Cutover Gates (Go/No-Go)

Use this file as the mandatory pre-cutover control checklist.

## 1) Direct Existence Gate

Run:

```bash
python cutover_gate_check.py
```

Pass condition:
- `overall` must be `PASS`
- `failed` must be `0`

This verifies critical existence across:
- Finance/Accounting APIs
- Sales/CRM APIs
- Marketing APIs
- Inventory APIs
- HR APIs
- Workspace UI section exposure
- Strict production flags in docs
- AI runtime dependency markers

## 2) Strict Production Runtime Gate

Required environment values before launch:

```bash
NEURALBI_STRICT_PRODUCTION=true
ENABLE_DEMO_SEED_DATA=false
ENABLE_LIVE_KPI_SIMULATOR=false
```

Pass condition:
- No demo seeding
- No synthetic KPI simulator
- No mock-only AI fallback responses in strict mode

## 3) API Health Gate

Run backend and verify:

```bash
curl http://localhost:8000/health
```

Pass condition:
- HTTP 200
- `status=healthy`

## 4) Domain Smoke Gate

Validate these domains end-to-end with real tenant data:
- Sales/CRM: deals + target attainment
- Marketing: campaigns CRUD
- Inventory: item CRUD + health
- Accounting/Finance: daybook, trial balance, balance sheet
- HR: employee list + stats

Pass condition:
- All domain workflows complete without manual DB patching

## 5) Cutover Decision

Go only if all gates pass.

If any gate fails:
- Block production cutover
- Fix root cause
- Re-run from gate 1
