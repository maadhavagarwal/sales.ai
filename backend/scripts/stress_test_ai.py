
import sqlite3
import pandas as pd
import random
from datetime import datetime, timedelta
import sys
import os

# Add parent dir to path to import app modules
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Dynamically get DB_PATH from database_manager
from app.core.database_manager import DB_PATH
from app.engines.intelligence_engine import IntelligenceEngine

def setup_stress_data():
    conn = sqlite3.connect(DB_PATH)
    company_id = "STRESS_TEST_001"
    
    print(f"Setting up stress test data for {company_id}...")
    print(f"Using DB at: {DB_PATH}")
    
    # 1. Setup Inventory
    conn.execute("DELETE FROM inventory WHERE company_id = ?", (company_id,))
    # PRAGMA table_info(inventory) says columns are sku, name, quantity, cost_price, sale_price, category, hsn_code, location, company_id
    conn.execute("""
        INSERT INTO inventory (sku, name, quantity, cost_price, sale_price, category, location, company_id)
        VALUES 
        ('SKU-LOW', 'Scarcity Item', 5, 1000, 1500, 'Tech', 'Main', ?),
        ('SKU-HIGH', 'Overstock Item', 500, 1000, 1500, 'Tech', 'Main', ?)
    """, (company_id, company_id))
    
    # 2. Setup Sales Velocity (High Demand)
    conn.execute("DELETE FROM invoices WHERE company_id = ?", (company_id,))
    for i in range(25):
        inv_id = f"INV-STR-{i}"
        date = (datetime.now() - timedelta(days=random.randint(0, 5))).strftime("%Y-%m-%d")
        conn.execute("""
            INSERT INTO invoices (id, invoice_number, company_id, grand_total, date, status)
            VALUES (?, ?, ?, ?, ?, 'PAID')
        """, (inv_id, inv_id, company_id, 1500, date))
    
    # 3. Setup Fraudulent Transaction (Outlier)
    conn.execute("""
        INSERT INTO invoices (id, invoice_number, company_id, grand_total, date, status)
        VALUES ('FRAUD-001', 'FRAUD-001', ?, 5000000, ?, 'PENDING')
    """, (company_id, datetime.now().strftime("%Y-%m-%d")))
    
    conn.commit()
    conn.close()
    return company_id

def run_ai_stress_test(company_id):
    print("\n--- RUNNING NEURAL STRESS TEST ---\n")
    
    # 1. Test Dynamic Pricing
    print("Testing Dynamic Pricing Optimization...")
    try:
        low_stock = IntelligenceEngine.calculate_dynamic_pricing(company_id, 'SKU-LOW')
        high_stock = IntelligenceEngine.calculate_dynamic_pricing(company_id, 'SKU-HIGH')
        
        print(f"Low Stock (Scarcity): {low_stock.get('dynamic_price')} (Base: {low_stock.get('base_price')}) -> {low_stock.get('strategy')}")
        print(f"High Stock (Liquidation): {high_stock.get('dynamic_price')} (Base: {high_stock.get('base_price')}) -> {high_stock.get('strategy')}")
    except Exception as e:
        print(f"Dynamic Pricing Test Failed: {e}")
    
    # 2. Test Fraud Detection
    print("\nTesting Neural Fraud Detection...")
    try:
        alerts = IntelligenceEngine.detect_financial_fraud(company_id)
        print(f"Detected {len(alerts)} anomalies.")
        for alert in alerts:
            print(f"Alert: {alert['reason']} | Amount: {alert['amount']} | Severity: {alert['severity']}")
    except Exception as e:
        print(f"Fraud Detection Test Failed: {e}")
        
    # 3. Test Inventory Forecast
    print("\nTesting Demand Forecasting...")
    try:
        forecasts = IntelligenceEngine.forecast_inventory_demand(company_id)
        print(f"Forecasted {len(forecasts)} potential stockouts.")
        for f in forecasts:
            print(f"SKU: {f['sku']} | Days to Stockout: {f['days_to_stockout']} | Risk: {f['risk']} | Reorder: {f['recommended_order']}")
    except Exception as e:
        print(f"Demand Forecasting Test Failed: {e}")

if __name__ == "__main__":
    cid = setup_stress_data()
    run_ai_stress_test(cid)
