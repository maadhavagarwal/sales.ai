"""
=============================================================================
  SALES AI PLATFORM — PRODUCTION E2E TEST SUITE
  Target: https://sales-ai-two-omega.vercel.app (Vercel + Render backend)
  Dataset: Book1.csv (82 records, chemical trading invoices)
=============================================================================
"""
import requests
import time
import json
import os
import sys
import traceback

# ─── CONFIG ─────────────────────────────────────────────────────────────────
# The Vercel frontend proxies API calls to the Render backend.
# We test both the backend API directly AND the frontend proxy.
BACKEND_API = os.getenv("BACKEND_API", "https://neuralbi-backend.onrender.com")
FRONTEND_URL = "https://sales-ai-two-omega.vercel.app"
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Book1.csv")
TIMEOUT = 60  # seconds per request (Render cold starts can be slow)

# ─── TEST RESULTS ───────────────────────────────────────────────────────────
results = []
start_total = time.time()

def test(name, fn, category="CORE"):
    """Run a single test and record result."""
    global results
    print(f"\n{'─'*60}")
    print(f"  🧪 [{category}] {name}")
    print(f"{'─'*60}")
    start = time.time()
    try:
        status, detail = fn()
        elapsed = round(time.time() - start, 2)
        icon = "✅" if status == "PASS" else "⚠️" if status == "WARN" else "❌"
        print(f"  {icon} {status} ({elapsed}s)")
        if detail: print(f"     ↳ {detail[:200]}")
        results.append({"category": category, "test": name, "status": status, "time": elapsed, "detail": str(detail)[:300]})
    except Exception as e:
        elapsed = round(time.time() - start, 2)
        print(f"  ❌ FAIL ({elapsed}s) — {str(e)[:150]}")
        results.append({"category": category, "test": name, "status": "FAIL", "time": elapsed, "detail": str(e)[:300]})

# ─── HELPER ─────────────────────────────────────────────────────────────────
auth_token = None

def api(method, path, **kwargs):
    url = f"{BACKEND_API}{path}"
    headers = kwargs.pop("headers", {})
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    return getattr(requests, method)(url, headers=headers, timeout=TIMEOUT, **kwargs)

# =============================================================================
# PHASE 1: INFRASTRUCTURE & AUTH
# =============================================================================
def test_backend_health():
    r = api("get", "/")
    if r.status_code == 200:
        return "PASS", f"Backend Online. Response: {r.json()}"
    return "FAIL", f"Status {r.status_code}"

def test_health_endpoint():
    r = api("get", "/health")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Engines: {data.get('engines', {})}"
    return "FAIL", f"Status {r.status_code}"

def test_frontend_landing():
    r = requests.get(FRONTEND_URL, timeout=TIMEOUT)
    if r.status_code == 200 and "NeuralBI" in r.text:
        return "PASS", f"Landing page loaded ({len(r.text)} bytes)"
    return "FAIL", f"Status {r.status_code}"

def test_register():
    global auth_token
    r = api("post", "/register", json={"email": f"test_{int(time.time())}@enterprise.ai", "password": "TestPass123!", "role": "ADMIN"})
    if r.status_code == 200:
        data = r.json()
        auth_token = data.get("token")
        return "PASS", f"Registered. Token received: {bool(auth_token)}, Role: {data.get('role')}"
    return "WARN", f"Status {r.status_code} — {r.text[:100]}"

def test_login():
    global auth_token
    # Try a known test account or the one we just created
    r = api("post", "/login", json={"email": "admin@enterprise.ai", "password": "admin123"})
    if r.status_code == 200:
        data = r.json()
        auth_token = data.get("token") or auth_token
        return "PASS", f"Login OK. Role: {data.get('role')}"
    return "WARN", f"Status {r.status_code} — Login with default creds failed (expected if custom)"

# =============================================================================
# PHASE 2: DATA INGESTION (Book1.csv)
# =============================================================================
dataset_id = None

def test_csv_upload():
    global dataset_id
    with open(CSV_PATH, "rb") as f:
        r = api("post", "/upload-csv", files={"file": ("Book1.csv", f, "text/csv")})
    if r.status_code == 200:
        data = r.json()
        dataset_id = data.get("dataset_id")
        rows = data.get("rows", 0)
        cols = len(data.get("columns", []))
        return "PASS", f"Uploaded. ID={dataset_id}, Rows={rows}, Cols={cols}"
    return "FAIL", f"Status {r.status_code}: {r.text[:200]}"

def test_workspace_upload():
    with open(CSV_PATH, "rb") as f:
        r = api("post", "/workspace/universal-upload", files={"files": ("Book1.csv", f, "text/csv")})
    if r.status_code == 200:
        data = r.json()
        analysis = data.get("analysis", [])
        cat = analysis[0].get("category") if analysis else "UNKNOWN"
        recs = analysis[0].get("records") if analysis else 0
        return "PASS", f"Workspace ingestion OK. Category={cat}, Records={recs}"
    return "WARN", f"Status {r.status_code}: {r.text[:200]}"

# =============================================================================
# PHASE 3: WORKSPACE — INVOICES
# =============================================================================
def test_get_invoices():
    r = api("get", "/workspace/invoices")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else data.get("count", 0)
        return "PASS", f"Invoices fetched: {count} records"
    return "FAIL", f"Status {r.status_code}"

def test_create_invoice():
    r = api("post", "/workspace/invoices", json={
        "customer_id": "Test Corp",
        "date": "2024-11-15",
        "due_date": "2024-12-15",
        "items": [{"name": "HDPE Off Grade", "quantity": 1000, "price": 168, "tax_rate": 18, "hsn_code": "39011010"}],
        "notes": "E2E Test Invoice"
    })
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Invoice created: {data.get('id', 'N/A')}, Total: {data.get('grand_total', 'N/A')}"
    return "FAIL", f"Status {r.status_code}: {r.text[:200]}"

# =============================================================================
# PHASE 4: WORKSPACE — CUSTOMERS (CRM)
# =============================================================================
def test_get_customers():
    r = api("get", "/workspace/customers")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Customers: {count} entities"
    return "FAIL", f"Status {r.status_code}"

def test_add_customer():
    r = api("post", "/workspace/customers", json={
        "name": f"E2E Test Corp {int(time.time())}",
        "email": "test@corp.com",
        "phone": "+91 9876543210",
        "gstin": "27AAAAA0000A1Z5",
        "pan": "ABCDE1234F",
        "address": "Mumbai, Maharashtra"
    })
    if r.status_code == 200:
        return "PASS", f"Customer added: {r.json()}"
    return "FAIL", f"Status {r.status_code}: {r.text[:200]}"

def test_crm_health_scores():
    r = api("get", "/crm/health-scores")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, dict) else 0
        return "PASS", f"Health scores for {count} customers"
    return "FAIL", f"Status {r.status_code}"

def test_crm_predictive_insights():
    r = api("get", "/crm/predictive-insights")
    if r.status_code == 200:
        data = r.json()
        insights = data.get("insights", [])
        return "PASS", f"Predictive insights: {len(insights)} signals. Types: {[i.get('type') for i in insights[:3]]}"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# PHASE 5: WORKSPACE — INVENTORY
# =============================================================================
def test_get_inventory():
    r = api("get", "/workspace/inventory")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Inventory items: {count}"
    return "FAIL", f"Status {r.status_code}"

def test_inventory_health():
    r = api("get", "/workspace/inventory/health")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Inventory health: {json.dumps(data)[:200]}"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# PHASE 6: ACCOUNTING & FINANCE
# =============================================================================
def test_get_ledger():
    r = api("get", "/workspace/ledger")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Ledger entries: {count}"
    return "FAIL", f"Status {r.status_code}"

def test_get_daybook():
    r = api("get", "/workspace/accounting/daybook")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Daybook vouchers: {count}"
    return "FAIL", f"Status {r.status_code}"

def test_trial_balance():
    r = api("get", "/workspace/accounting/trial-balance")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Trial balance accounts: {count}"
    return "FAIL", f"Status {r.status_code}"

def test_pl_statement():
    r = api("get", "/workspace/accounting/pl")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"P&L: {json.dumps(data)[:200]}"
    return "FAIL", f"Status {r.status_code}"

def test_balance_sheet():
    r = api("get", "/workspace/accounting/balance-sheet")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Balance Sheet: {json.dumps(data)[:200]}"
    return "FAIL", f"Status {r.status_code}"

def test_financial_statements():
    r = api("get", "/workspace/accounting/statements")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Statements: {list(data.keys()) if isinstance(data, dict) else 'list'}"
    return "FAIL", f"Status {r.status_code}"

def test_gst_reports():
    r = api("get", "/workspace/accounting/gst")
    if r.status_code == 200:
        return "PASS", f"GST Reports: {json.dumps(r.json())[:200]}"
    return "FAIL", f"Status {r.status_code}"

def test_gstr1_json():
    r = api("get", "/workspace/accounting/gst/gstr1-json")
    if r.status_code == 200:
        return "PASS", f"GSTR-1 JSON: {json.dumps(r.json())[:200]}"
    return "FAIL", f"Status {r.status_code}"

def test_working_capital():
    r = api("get", "/workspace/accounting/working-capital")
    if r.status_code == 200:
        return "PASS", f"Working Capital: {json.dumps(r.json())[:200]}"
    return "FAIL", f"Status {r.status_code}"

def test_cfo_report():
    r = api("get", "/workspace/accounting/cfo-report")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"CFO Report: EBITDA={data.get('ebitda')}, Health={data.get('business_health')}, CR={data.get('current_ratio')}"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# PHASE 7: AI INTELLIGENCE ENGINE
# =============================================================================
def test_cash_flow_forecast():
    r = api("get", "/workspace/accounting/cash-flow-gap")
    if r.status_code == 200:
        data = r.json()
        risk = data.get("risk_assessment")
        points = len(data.get("forecast_90d", []))
        return "PASS", f"Cash Flow: Risk={risk}, Forecast Points={points}"
    return "FAIL", f"Status {r.status_code}"

def test_anomaly_detection():
    r = api("get", "/workspace/accounting/anomalies")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Anomalies: {json.dumps(data)[:200]}"
    return "FAIL", f"Status {r.status_code}"

def test_derivatives():
    r = api("post", "/workspace/accounting/derivatives", json={
        "underlying": "NIFTY",
        "portfolio_value": 10000000,
        "portfolio_beta": 0.95
    })
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Derivatives: {json.dumps(data)[:200]}"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# PHASE 8: EXPENSES & PROCUREMENT
# =============================================================================
def test_get_expenses():
    r = api("get", "/workspace/expenses")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Expenses: {count} entries"
    return "FAIL", f"Status {r.status_code}"

def test_procurement_orders():
    r = api("get", "/workspace/procurement/orders")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Procurement: {json.dumps(data)[:200]}"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# PHASE 9: AI COPILOT & NLP
# =============================================================================
def test_copilot():
    if not dataset_id:
        return "WARN", "No dataset_id — skipping copilot test"
    r = api("post", f"/copilot/{dataset_id}", json="What are the top 5 customers by quantity?")
    if r.status_code == 200:
        data = r.json()
        return "PASS", f"Copilot Response: {json.dumps(data)[:200]}"
    return "WARN", f"Status {r.status_code}: {r.text[:100]} (may need LLM)"

# =============================================================================
# PHASE 10: WORKSPACE SYNC & DASHBOARD
# =============================================================================
def test_workspace_sync():
    r = api("get", "/dashboard/sync-workspace")
    if r.status_code == 200:
        data = r.json()
        rows = data.get("rows", 0)
        ds_id = data.get("dataset_id")
        return "PASS", f"Sync: {rows} rows, ID={ds_id}"
    return "WARN", f"Status {r.status_code}: {r.text[:200]}"

# =============================================================================
# PHASE 11: CUSTOMER LEDGER
# =============================================================================
def test_customer_ledger():
    r = api("get", "/workspace/accounting/customer-ledger/Pallmer")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Customer Ledger (Pallmer): {count} entries"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# PHASE 12: MARKETING
# =============================================================================
def test_marketing_campaigns():
    r = api("get", "/workspace/marketing/campaigns")
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return "PASS", f"Marketing campaigns: {count}"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# PHASE 13: FRONTEND PAGE CHECKS
# =============================================================================
def test_frontend_login_page():
    r = requests.get(f"{FRONTEND_URL}/login", timeout=TIMEOUT)
    if r.status_code == 200:
        return "PASS", f"Login page loaded ({len(r.text)} bytes)"
    return "FAIL", f"Status {r.status_code}"

def test_frontend_dashboard_page():
    r = requests.get(f"{FRONTEND_URL}/dashboard", timeout=TIMEOUT)
    if r.status_code == 200:
        return "PASS", f"Dashboard page loaded ({len(r.text)} bytes)"
    return "FAIL", f"Status {r.status_code}"

def test_frontend_workspace_page():
    r = requests.get(f"{FRONTEND_URL}/workspace", timeout=TIMEOUT)
    if r.status_code == 200:
        return "PASS", f"Workspace page loaded ({len(r.text)} bytes)"
    return "FAIL", f"Status {r.status_code}"

def test_frontend_crm_page():
    r = requests.get(f"{FRONTEND_URL}/crm", timeout=TIMEOUT)
    if r.status_code == 200:
        return "PASS", f"CRM page loaded ({len(r.text)} bytes)"
    return "FAIL", f"Status {r.status_code}"

def test_frontend_onboarding():
    r = requests.get(f"{FRONTEND_URL}/onboarding", timeout=TIMEOUT)
    if r.status_code == 200:
        return "PASS", f"Onboarding page loaded ({len(r.text)} bytes)"
    return "FAIL", f"Status {r.status_code}"

# =============================================================================
# EXECUTE ALL TESTS
# =============================================================================
if __name__ == "__main__":
    print("=" * 70)
    print("  🚀 SALES AI PLATFORM — PRODUCTION E2E TEST SUITE")
    print(f"  Target Backend: {BACKEND_API}")
    print(f"  Target Frontend: {FRONTEND_URL}")
    print(f"  Dataset: {CSV_PATH}")
    print(f"  Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Phase 1: Infrastructure
    test("Backend Health Check", test_backend_health, "INFRA")
    test("Health Endpoint", test_health_endpoint, "INFRA")
    test("Frontend Landing Page", test_frontend_landing, "INFRA")

    # Phase 2: Auth
    test("User Registration", test_register, "AUTH")
    test("User Login", test_login, "AUTH")

    # Phase 3: Data Ingestion
    test("CSV Upload (Analytics Pipeline)", test_csv_upload, "INGESTION")
    test("Workspace Universal Upload (Enterprise)", test_workspace_upload, "INGESTION")

    # Phase 4: Invoices
    test("Get Invoices", test_get_invoices, "INVOICES")
    test("Create Invoice", test_create_invoice, "INVOICES")

    # Phase 5: CRM
    test("Get Customers", test_get_customers, "CRM")
    test("Add Customer", test_add_customer, "CRM")
    test("CRM Health Scores", test_crm_health_scores, "CRM")
    test("CRM Predictive Insights", test_crm_predictive_insights, "CRM")

    # Phase 6: Inventory
    test("Get Inventory", test_get_inventory, "INVENTORY")
    test("Inventory Health", test_inventory_health, "INVENTORY")

    # Phase 7: Accounting
    test("General Ledger", test_get_ledger, "ACCOUNTING")
    test("Daybook", test_get_daybook, "ACCOUNTING")
    test("Trial Balance", test_trial_balance, "ACCOUNTING")
    test("Profit & Loss", test_pl_statement, "ACCOUNTING")
    test("Balance Sheet", test_balance_sheet, "ACCOUNTING")
    test("Financial Statements", test_financial_statements, "ACCOUNTING")
    test("GST Reports", test_gst_reports, "ACCOUNTING")
    test("GSTR-1 JSON Export", test_gstr1_json, "ACCOUNTING")
    test("Working Capital", test_working_capital, "ACCOUNTING")
    test("CFO Report", test_cfo_report, "ACCOUNTING")
    test("Customer Ledger (Pallmer)", test_customer_ledger, "ACCOUNTING")

    # Phase 8: AI Intelligence
    test("Cash Flow Forecast (90D)", test_cash_flow_forecast, "AI_ENGINE")
    test("Anomaly Detection", test_anomaly_detection, "AI_ENGINE")
    test("Derivatives Engine", test_derivatives, "AI_ENGINE")

    # Phase 9: Expenses & Procurement
    test("Expenses", test_get_expenses, "OPERATIONS")
    test("Procurement Orders", test_procurement_orders, "OPERATIONS")

    # Phase 10: AI Copilot
    test("AI Copilot Query", test_copilot, "AI_COPILOT")

    # Phase 11: Workspace Sync
    test("Workspace → Dashboard Sync", test_workspace_sync, "SYNC")

    # Phase 12: Marketing
    test("Marketing Campaigns", test_marketing_campaigns, "MARKETING")

    # Phase 13: Frontend Pages
    test("Login Page", test_frontend_login_page, "FRONTEND")
    test("Dashboard Page", test_frontend_dashboard_page, "FRONTEND")
    test("Workspace Page", test_frontend_workspace_page, "FRONTEND")
    test("CRM Page", test_frontend_crm_page, "FRONTEND")
    test("Onboarding Page", test_frontend_onboarding, "FRONTEND")

    # ─── SUMMARY ────────────────────────────────────────────────────────
    total_time = round(time.time() - start_total, 1)
    pass_count = sum(1 for r in results if r["status"] == "PASS")
    warn_count = sum(1 for r in results if r["status"] == "WARN")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)

    print("\n\n" + "=" * 70)
    print("  📊 PRODUCTION TEST REPORT — EXECUTIVE SUMMARY")
    print("=" * 70)
    print(f"  Total Tests: {total}")
    print(f"  ✅ PASS: {pass_count}  |  ⚠️ WARN: {warn_count}  |  ❌ FAIL: {fail_count}")
    print(f"  Total Time: {total_time}s")
    print(f"  Pass Rate: {round(pass_count/total*100, 1)}%")
    print("=" * 70)

    # Detailed breakdown by category
    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = {"PASS": 0, "WARN": 0, "FAIL": 0}
        categories[cat][r["status"]] = categories[cat].get(r["status"], 0) + 1

    print("\n  BREAKDOWN BY CATEGORY:")
    print(f"  {'Category':<20} {'PASS':<8} {'WARN':<8} {'FAIL':<8}")
    print(f"  {'─'*44}")
    for cat, counts in categories.items():
        print(f"  {cat:<20} {counts.get('PASS',0):<8} {counts.get('WARN',0):<8} {counts.get('FAIL',0):<8}")

    # Failed tests detail
    failures = [r for r in results if r["status"] == "FAIL"]
    if failures:
        print(f"\n  ❌ FAILED TESTS DETAIL:")
        for f in failures:
            print(f"    [{f['category']}] {f['test']}: {f['detail'][:100]}")

    # Save JSON report
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "production_test_report.json")
    with open(report_path, "w") as rf:
        json.dump({
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
            "target": BACKEND_API,
            "dataset": "Book1.csv",
            "summary": {"total": total, "pass": pass_count, "warn": warn_count, "fail": fail_count, "time": total_time},
            "results": results
        }, rf, indent=2)
    print(f"\n  📄 Full report saved to: {report_path}")
