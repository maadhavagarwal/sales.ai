import requests
import json
import uuid
import os

BASE_URL = "http://localhost:8000"

def print_result(name, result, is_success):
    icon = "✅" if is_success else "❌"
    print(f"{icon} {name}")
    if not is_success:
        print(f"   => {result}")

def main():
    print("🚀 Starting Enterprise Full Stack AI & Workspace Tests...\n")
    
    # 1. Create a synthetic sales CSV for testing
    csv_file = "test_data.csv"
    with open(csv_file, "w") as f:
        f.write("date,customer,revenue,product\n2026-03-01,Acme Corp,5000,Widget A\n2026-03-02,Globex,15000,Widget B\n")
    
    # 2. Upload CSV
    try:
        with open(csv_file, 'rb') as f:
            res = requests.post(f"{BASE_URL}/upload-csv", files={"file": f})
        if res.status_code == 200:
            dataset_id = res.json().get("dataset_id")
            print_result("CSV Upload + Pipeline Execution", "Success", True)
        else:
            print_result("CSV Upload + Pipeline Execution", res.text, False)
            dataset_id = None
    except Exception as e:
        print_result("CSV Upload + Pipeline Execution", str(e), False)
        dataset_id = None
        
    # 3. Copilot Test
    if dataset_id:
        try:
            res = requests.post(f"{BASE_URL}/copilot/{dataset_id}", json="What is the total revenue?")
            print_result("Copilot Query (Dataset Context)", res.json().get("answer", "No answer"), res.status_code == 200)
        except Exception as e:
            print_result("Copilot Query (Dataset Context)", str(e), False)
            
        try:
            res = requests.post(f"{BASE_URL}/dashboard-config/{dataset_id}")
            print_result("AI Dashboard Config Gen", "Success", res.status_code == 200)
        except Exception as e:
            print_result("AI Dashboard Config Gen", str(e), False)
            
    # 4. Workspace Sync (Simulates 'Sync Current Dataset')
    try:
        res = requests.get(f"{BASE_URL}/dashboard/sync-workspace")
        # Could be 200 or 400 if no data
        if res.status_code in [200, 400]:
            print_result("Workspace AI Sync to Dashboard", "Success", True)
        else:
            print_result("Workspace AI Sync to Dashboard", res.text, False)
    except Exception as e:
        print_result("Workspace AI Sync to Dashboard", str(e), False)

    # 5. Core modules
    endpoints = {
        "CRM Customers": "/workspace/customers",
        "Inventory Stats": "/workspace/inventory",
        "Billing Invoices": "/workspace/invoices",
        "Operating Expenses": "/workspace/expenses",
        "Marketing Campaigns": "/workspace/marketing/campaigns",
        "General Ledger": "/workspace/ledger",
        "Accounting Daybook": "/workspace/accounting/daybook",
        "Trial Balance": "/workspace/accounting/trial-balance",
        "Risk Derivatives Matrix": "/workspace/accounting/derivatives",
        "Profit & Loss (P&L)": "/workspace/accounting/pl",
        "Balance Sheet (BS)": "/workspace/accounting/balance-sheet",
        "GST Compliance Report": "/workspace/accounting/gst",
        "CFO Intelligence Health": "/workspace/accounting/cfo-report",
        "Platform Usage Stats": "/workspace/usage-stats"
    }
    
    for name, path in endpoints.items():
        try:
            if "derivatives" in path:
                res = requests.post(f"{BASE_URL}{path}", json={"underlying": "NIFTY", "expiry": "", "portfolio_value": 1e7, "portfolio_beta": 0.95, "hedge_ratio_target": 1})
            else:
                res = requests.get(f"{BASE_URL}{path}")
            
            # Allow 500 for PL/BS if empty ledger but still hit endpoint
            if res.status_code in [200, 500]: 
                # Ideally 200 for all
                if res.status_code == 200:
                    print_result(f"Module: {name}", "Success", True)
                else:
                    print_result(f"Module: {name}", f"Error 500: {res.text[:100]}", False)
            else:
                print_result(f"Module: {name}", res.text[:100], False)
        except Exception as e:
            print_result(f"Module: {name}", str(e), False)
            
    # 6. Live Agent / NLBI
    try:
        res = requests.post(f"{BASE_URL}/copilot-chat", json={"query": "Summarize my business health."})
        print_result("Live Copilot Enterprise Chat", "Success", res.status_code == 200)
    except Exception as e:
        print_result("Live Copilot Enterprise Chat", str(e), False)

    try:
        res = requests.get(f"{BASE_URL}/workspace/business-report/download")
        print_result("Consolidated AI Business Report Generation", "Success", res.status_code == 200)
    except Exception as e:
        print_result("Consolidated AI Business Report Generation", str(e), False)

    # Cleanup
    if os.path.exists(csv_file):
        os.remove(csv_file)
        
    print("\n🏁 Full Stack Validation Routine Completed.")

if __name__ == "__main__":
    main()
