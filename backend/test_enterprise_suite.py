import sqlite3
import pandas as pd
import io
import os
import sys
import json
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.engines.workspace_engine import WorkspaceEngine
from app.engines.intelligence_engine import IntelligenceEngine
import app.core.database_manager as db_manager

TEST_DB = "test_enterprise.db"

def setup_test_db():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    
    # Force DB_PATH to test DB before init
    import app.core.database_manager as db_manager
    db_manager.DB_PATH = TEST_DB
    db_manager.init_workspace_db()

def run_full_test():
    print("🚀 INITIALIZING ENTERPRISE TEST SUITE...")
    setup_test_db()
    
    # Patch DB_PATH in modules to use test DB
    import app.engines.workspace_engine
    import app.engines.intelligence_engine
    app.engines.workspace_engine.DB_PATH = TEST_DB
    app.engines.intelligence_engine.DB_PATH = TEST_DB
    
    csv_path = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\Book1.csv"
    with open(csv_path, "rb") as f:
        content = f.read()
    
    # Step 1: Ingestion
    print("\n--- Phase 1: Universal Data Ingestion ---")
    files_metadata = [{"name": "Book1.csv", "content": content}]
    ingest_res = WorkspaceEngine.process_universal_upload(1, files_metadata)
    print(f"Status: {ingest_res['status']}")
    print(f"Analysis: {json.dumps(ingest_res['analysis'], indent=2)}")
    
    # Step 2: Verification
    print("\n--- Phase 2: Record Verification ---")
    conn = sqlite3.connect(TEST_DB)
    inv_count = conn.execute("SELECT COUNT(*) FROM invoices").fetchone()[0]
    total_rev = conn.execute("SELECT SUM(grand_total) FROM invoices").fetchone()[0] or 0
    print(f"Total Invoices Processed: {inv_count}")
    print(f"Total Portfolio Revenue: ₹{total_rev:,.2f}")
    
    # Step 3: Predictive Analytics
    print("\n--- Phase 3: Intelligence Engine Test ---")
    anomalies = IntelligenceEngine.detect_anomalies()
    print(f"Anomalies Detected: {len(anomalies.get('alerts', []))}")
    if anomalies.get('alerts'):
        print(f"Sample Alert: {anomalies['alerts'][0]['insight']}")
        
    cash_flow = IntelligenceEngine.get_cash_flow_forecast()
    print(f"Cash Flow Status: {cash_flow['risk_assessment']}")
    print(f"90D Projected Cash (End): ₹{cash_flow['forecast_90d'][-1]['projected_cash'] if cash_flow['forecast_90d'] else 0:,.2f}")
    
    scenarios = IntelligenceEngine.get_revenue_scenarios()
    print(f"Revenue Scenarios Generated: {len(scenarios)}")
    for s in scenarios:
        print(f"  > {s['case']}: ₹{s['revenue']:,.0f}")
        
    crm_insights = WorkspaceEngine.get_predictive_crm_insights()
    print(f"CRM Predictive Insights: {len(crm_insights)}")
    for insight in crm_insights:
        print(f"  [{insight['type']}] {insight['insight']}")
        
    conn.close()
    print("\n✅ ENTERPRISE TEST SUITE COMPLETE.")
    
    # Generate Report Object
    report = {
        "timestamp": datetime.now().isoformat(),
        "dataset": "Book1.csv",
        "ingestion": ingest_res,
        "metrics": {
            "invoice_count": inv_count,
            "total_revenue": total_rev
        },
        "intelligence": {
            "anomalies": anomalies,
            "cash_flow": cash_flow,
            "scenarios": scenarios,
            "crm": crm_insights
        }
    }
    with open("test_report.json", "w") as rf:
        json.dump(report, rf, indent=2)

if __name__ == "__main__":
    run_full_test()
