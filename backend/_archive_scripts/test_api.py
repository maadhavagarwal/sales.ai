import requests, json, sys, io
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:8003"

r = requests.post(f"{BASE}/login", json={"email": "test@audit.com", "password": "TestAudit123!"})
if r.status_code != 200 or not r.json().get("token"):
    r = requests.post(f"{BASE}/register-enterprise", json={
        "email": "test@audit.com", "password": "TestAudit123!",
        "companyDetails": {"name": "Audit Corp", "contact_person": "Auditor"}
    })
    if r.status_code != 200:
        print("AUTH FAILED"); sys.exit(1)

token = r.json()["token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("AUTH OK\n")

fails = []

def t(name, method, path, body=None):
    url = f"{BASE}{path}"
    try:
        if method == "GET": r = requests.get(url, headers=H, timeout=12)
        elif method == "POST": r = requests.post(url, headers=H, json=body or {}, timeout=12)
        elif method == "PUT": r = requests.put(url, headers=H, json=body or {}, timeout=12)
        else: r = requests.delete(url, headers=H, timeout=12)
        if r.status_code >= 400:
            msg = r.text[:300]
            fails.append((name, f"HTTP {r.status_code}", msg))
            print(f"FAIL {name}: {r.status_code} - {msg[:120]}")
            return None
        print(f"OK   {name}")
        return r.json() if r.text else {}
    except requests.exceptions.Timeout:
        fails.append((name, "TIMEOUT", "")); print(f"FAIL {name}: TIMEOUT"); return None
    except Exception as e:
        fails.append((name, "ERROR", str(e)[:200])); print(f"FAIL {name}: {e}"); return None

# 1. Onboarding
t("Onboarding Status", "GET", "/api/onboarding/status")
t("Company Profile", "POST", "/workspace/company-profile", {"action": "SAVE"}) 

# 2. AI
t("Copilot Chat", "POST", "/copilot-chat", {"query": "What is my revenue?", "dataset_id": "DEFAULT"})
t("NLBI Chart", "POST", "/nlbi-chart", {"query": "show revenue"})

# 3. Analytics
t("Scenarios", "GET", "/workspace/analytics/scenarios")
t("Leaderboard", "GET", "/workspace/analytics/leaderboard")
t("CRM Scores", "GET", "/workspace/crm/health-scores")
t("Forecast", "GET", "/ai/insights/cash-flow-forecast")
t("Recommendations", "GET", "/ai/insights/recommendations")

# 4. Segments
t("List Segments", "GET", "/api/segments")
seg = t("Create Segment", "POST", "/api/segments", {"name": "HV", "type": "rule", "rules": [{"field": "total_revenue", "operator": ">=", "value": "1000"}]})
if seg and seg.get("id"):
    t("Segment Detail", "GET", f"/api/segments/{seg['id']}")

# 5. Documents
t("Templates", "GET", "/api/documents/templates/list")
t("List Docs", "GET", "/api/documents")
t("Gen Doc", "POST", "/api/documents/generate", {"doc_type": "sales_report", "format": "pdf"})

# 6. Workspace
t("Customers", "GET", "/workspace/customers")
t("Invoices", "GET", "/workspace/invoices")
t("Inventory", "GET", "/workspace/inventory")
t("Employees", "GET", "/workspace/hr/employees")
t("Ledger", "GET", "/workspace/ledger")
t("Ledger Entries", "GET", "/workspace/ledger/entries")

# 7. Compliance
t("Trial Balance", "GET", "/workspace/accounting/trial-balance")
t("Audit Solvency", "GET", "/workspace/finance/audit-solvency")
t("Working Capital", "GET", "/workspace/accounting/working-capital")

# 8. Portal
t("Portal Dashboard", "GET", "/api/portal/dashboard")

# 9. Tally
t("Tally Sync", "POST", "/api/tally/sync", {"entity": "ledger"})

# 10. AI Advanced
t("CFO Health", "GET", "/ai/intelligence/cfo-health")
t("Anomalies", "GET", "/workspace/accounting/anomalies")
t("Pricing", "GET", "/ai/intelligence/dynamic-pricing/SKU100")
t("Outreach", "POST", "/ai/intelligence/outreach/generate", {"recipient": "John", "context": "follow up"})

print(f"\n\n===== SUMMARY =====")
total_tests = len(fails) + sum(1 for line in open(__file__) if 't("' in line) - 2 # rough calc
print(f"FAILED: {len(fails)}")
if fails:
    print(f"\n--- FAILURES ---")
    for name, code, msg in fails:
        print(f"  {name}: {code} {msg[:200]}")
