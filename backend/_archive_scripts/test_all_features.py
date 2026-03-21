"""
Comprehensive API Feature Test — hits every major endpoint and reports errors.
"""
import warnings
warnings.filterwarnings('ignore')
import requests
import json
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import traceback

BASE = "http://localhost:8001"

# ──── Step 1: Register + Login ────
def get_token():
    # Try login first
    try:
        r = requests.post(f"{BASE}/login", json={"email": "test@audit.com", "password": "TestAudit123!"})
        if r.status_code == 200 and r.json().get("token"):
            return r.json()["token"]
    except:
        pass
    
    # Register
    try:
        r = requests.post(f"{BASE}/register-enterprise", json={
            "email": "test@audit.com",
            "password": "TestAudit123!",
            "companyDetails": {"name": "Audit Corp", "contact_person": "Auditor"}
        })
        if r.status_code == 200 and r.json().get("token"):
            return r.json()["token"]
    except:
        pass
    
    # Fallback login
    r = requests.post(f"{BASE}/login", json={"email": "test@audit.com", "password": "TestAudit123!"})
    if r.status_code == 200:
        return r.json().get("token")
    print(f"AUTH FAILED: {r.status_code} {r.text[:200]}")
    return None

token = get_token()
if not token:
    print("FATAL: Cannot authenticate. Aborting tests.")
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"[PASS] Authenticated successfully\n")

results = []

def test(name, method, path, json_data=None, expect_key=None):
    """Test an endpoint and report result."""
    url = f"{BASE}{path}"
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, timeout=15)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=json_data or {}, timeout=15)
        elif method == "PUT":
            r = requests.put(url, headers=headers, json=json_data or {}, timeout=15)
        elif method == "DELETE":
            r = requests.delete(url, headers=headers, timeout=15)
        
        if r.status_code >= 400:
            results.append(("FAIL", name, f"HTTP {r.status_code}: {r.text[:200]}"))
            print(f"[FAIL] {name} — HTTP {r.status_code}: {r.text[:150]}")
            return None
        
        data = r.json() if r.text else {}
        if expect_key and expect_key not in str(data):
            results.append(("WARN", name, f"Missing expected key: {expect_key}"))
            print(f"[WARN] {name} — Missing key '{expect_key}' in response")
            return data
        
        results.append(("PASS", name, "OK"))
        print(f"[PASS] {name}")
        return data
    except requests.exceptions.ConnectionError:
        results.append(("FAIL", name, "CONNECTION REFUSED"))
        print(f"[FAIL] {name} -- CONNECTION REFUSED")
        return None
    except requests.exceptions.Timeout:
        results.append(("FAIL", name, "TIMEOUT"))
        print(f"[FAIL] {name} — TIMEOUT")
        return None
    except Exception as e:
        results.append(("FAIL", name, str(e)[:200]))
        print(f"[FAIL] {name} — {str(e)[:150]}")
        return None


print("=" * 60)
print("1. ENTERPRISE DATA NEXUS & ONBOARDING")
print("=" * 60)
test("Onboarding Status", "GET", "/api/onboarding/status")
test("Company Profile", "GET", "/workspace/company-profile")
test("System Health", "GET", "/system/health")

print("\n" + "=" * 60)
print("2. NEURAL INTELLIGENCE HUB")
print("=" * 60)
test("Copilot Chat", "POST", "/copilot/chat", {"message": "What is my revenue?", "mode": "analyst"})
test("NLBI Chart", "POST", "/nlbi-chart", {"query": "show revenue trend"})

print("\n" + "=" * 60)
print("3. SALES INTELLIGENCE & ANALYTICS")
print("=" * 60)
test("Analytics Dashboard", "GET", "/api/analytics/dashboard")
test("Sales Leaderboard", "GET", "/ai/intelligence/leaderboard")
test("Lead Scoring", "GET", "/ai/intelligence/lead-scoring")
test("Churn Risk", "GET", "/ai/intelligence/churn-risk")
test("Revenue Forecast", "GET", "/ai/intelligence/forecast")
test("Cross-Sell Recs", "GET", "/ai/intelligence/recommendations")

print("\n" + "=" * 60)
print("4. SEGMENT ANALYSIS SYSTEM")
print("=" * 60)
test("List Segments", "GET", "/api/segments")
test("RFM Compute", "GET", "/api/segments/rfm/compute")
test("Auto-Create RFM", "POST", "/api/segments/rfm/auto-create")
test("AI Clustering", "POST", "/api/segments/ai/cluster", {"n_clusters": 3})
test("Segment Insights", "GET", "/api/segments/insights/dashboard")
test("Auto Detect", "POST", "/api/segments/auto-detect")
seg = test("Create Segment", "POST", "/api/segments", {
    "name": "High Value Test",
    "type": "rule",
    "rules": [{"field": "total_revenue", "operator": ">=", "value": "1000"}],
    "description": "Test segment"
})
if seg and seg.get("id"):
    test("Get Segment Details", "GET", f"/api/segments/{seg['id']}")
    test("Create Trigger", "POST", f"/api/segments/{seg['id']}/trigger", {
        "trigger_type": "entry", "action_type": "alert"
    })
    test("Export Members", "GET", f"/api/segments/{seg['id']}/members/export")

print("\n" + "=" * 60)
print("5. DOCUMENT GENERATION SYSTEM")
print("=" * 60)
test("List Templates", "GET", "/api/documents/templates/list")
test("List Documents", "GET", "/api/documents")
doc = test("Generate Sales Report", "POST", "/api/documents/generate", {
    "doc_type": "sales_report", "format": "pdf", "title": "Test Sales Report"
})
doc2 = test("Generate Financial Report", "POST", "/api/documents/generate", {
    "doc_type": "financial_report", "format": "docx", "title": "Test Financial Report"
})
test("Generate Proposal", "POST", "/api/documents/generate", {
    "doc_type": "proposal", "format": "pdf"
})
test("Generate Contract", "POST", "/api/documents/generate", {
    "doc_type": "contract", "format": "pdf"
})
test("Schedule Report", "POST", "/api/documents/schedule", {
    "report_type": "sales_report", "frequency": "weekly", "emails": ["test@test.com"]
})
test("List Scheduled", "GET", "/api/documents/scheduled")
if doc and doc.get("id"):
    test("Get Document", "GET", f"/api/documents/{doc['id']}")
    test("Delete Document", "DELETE", f"/api/documents/{doc['id']}")

print("\n" + "=" * 60)
print("6. GLOBAL WORKSPACE")
print("=" * 60)
test("Get Customers", "GET", "/workspace/customers")
test("Get Invoices", "GET", "/workspace/invoices")
test("Get Inventory", "GET", "/workspace/inventory")
test("Get Employees", "GET", "/workspace/employees")
test("Get Ledger", "GET", "/workspace/ledger")
test("Ledger Entries", "GET", "/workspace/ledger/entries")
test("Procurement PO List", "POST", "/workspace/procurement/po", {"action": "LIST"})
test("Expense Analytics", "GET", "/workspace/expenses/analytics")
test("User State", "GET", "/workspace/user-state")

print("\n" + "=" * 60)
print("7. COMPLIANCE & FINANCIAL SYSTEMS")
print("=" * 60)
test("Financial Reports (P&L)", "GET", "/workspace/accounting/reports")
test("Audit Solvency", "GET", "/workspace/finance/audit-solvency")
test("Derivatives Snapshot", "POST", "/workspace/accounting/derivatives", {})

print("\n" + "=" * 60)
print("8. CUSTOMER PORTAL")
print("=" * 60)
test("Portal Dashboard", "GET", "/api/portal/dashboard")

print("\n" + "=" * 60)
print("9. TALLY SYNC")
print("=" * 60)
test("Tally Status", "GET", "/api/tally/status")
test("Tally Sync Trigger", "POST", "/api/tally/sync", {"entity": "ledger"})
test("Tally Import", "POST", "/api/tally/import", {"entity": "ledger"})

print("\n" + "=" * 60)
print("10. PRODUCTION READINESS")
print("=" * 60)
test("Adoption Confidence", "GET", "/system/adoption/confidence")
test("Incident Readiness", "GET", "/system/adoption/incident-readiness")
test("Backup Drill", "POST", "/system/adoption/backup-drill")
test("Parity Check", "POST", "/system/adoption/parity", {"source_counts": {"invoices": 10}, "tolerance": 5})

print("\n" + "=" * 60)
print("11. AI INTELLIGENCE FEATURES")
print("=" * 60)
test("What-If Simulation", "POST", "/ai/intelligence/simulation", {"scenario": "price_increase", "params": {"increase_pct": 10}})
test("CFO Report", "GET", "/ai/intelligence/cfo-report")
test("Anomaly Detection", "GET", "/ai/intelligence/anomalies")
test("Market Intelligence", "GET", "/ai/intelligence/market")
test("Dynamic Pricing", "GET", "/ai/intelligence/dynamic-pricing/SKU001")
test("AI Outreach", "POST", "/ai/intelligence/outreach/generate", {"recipient": "John", "context": "follow up"})

print("\n" + "=" * 60)
print("12. WORKSPACE DATA UPLOAD")
print("=" * 60)
test("Dataset List", "GET", "/datasets")

# ──── SUMMARY ────
print("\n\n" + "=" * 60)
print("FINAL SUMMARY")
print("=" * 60)
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = sum(1 for s, _, _ in results if s == "FAIL")
warned = sum(1 for s, _, _ in results if s == "WARN")
print(f"\n✅ PASSED: {passed}")
print(f"⚠️  WARNED: {warned}")
print(f"❌ FAILED: {failed}")
print(f"📊 TOTAL:  {len(results)}")

if failed > 0:
    print(f"\n--- FAILURES ---")
    for s, name, msg in results:
        if s == "FAIL":
            print(f"  ❌ {name}: {msg[:200]}")

if warned > 0:
    print(f"\n--- WARNINGS ---")
    for s, name, msg in results:
        if s == "WARN":
            print(f"  ⚠️  {name}: {msg[:200]}")
