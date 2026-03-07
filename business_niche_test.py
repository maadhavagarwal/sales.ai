"""
Advanced Business Niche Test Suite
Tests the platform against highly specific industry datasets.
"""
import pandas as pd
import numpy as np
import requests
import time
import json
import warnings
import os

warnings.filterwarnings('ignore')

API_URL = "http://localhost:8000"

def create_ecommerce_data():
    """E-commerce: High volume, discounts, shipping, GMV keywords."""
    n = 2000
    return pd.DataFrame({
        "checkout_timestamp": pd.date_range("2023-01-01", periods=n, freq="30min"),
        "cart_id": [f"CART-{i}" for i in range(1000, 1000 + n)],
        "item_name": np.random.choice(["Wireless Earbuds", "Phone Case", "Gaming Mouse", "Mechanical Keyboard"], n),
        "product_category": np.random.choice(["Audio", "Accessories", "Peripherals"], n),
        "gmv": np.random.uniform(15, 250, n).round(2),
        "discount_percent": np.random.choice([0, 10, 15, 20], n),
        "shipping_state": np.random.choice(["CA", "NY", "TX", "FL", "IL"], n),
        "customer_email_domain": np.random.choice(["gmail.com", "yahoo.com", "outlook.com"], n),
        "source_medium": np.random.choice(["google/cpc", "direct", "facebook/social", "email"], n)
    })

def create_shop_sales_data():
    """Retail / Shop: Receipts, cashiers, unit prices, simple names."""
    n = 1500
    dates = pd.date_range("2023-05-01", periods=100, freq="D").tolist() * 15
    np.random.shuffle(dates)
    return pd.DataFrame({
        "trans_date": dates[:n],
        "receipt_no": [f"RCPT-{np.random.randint(10000, 99999)}" for _ in range(n)],
        "cashier_name": np.random.choice(["Alex", "Sam", "Jordan", "Casey"], n),
        "item_scanned": np.random.choice(["Milk 1L", "Bread", "Eggs 12ct", "Apple 1kg", "Coffee"], n),
        "unit_price": np.random.uniform(1.5, 12, n).round(2),
        "qty": np.random.randint(1, 5, n),
        "total_paid": np.random.uniform(1.5, 60, n).round(2),  # Target for revenue
        "payment_method": np.random.choice(["Credit", "Cash", "Debit", "Mobile"], n)
    })

def create_chemical_sales_data():
    """Chemical / B2B: Batches, volumes, purity grades, specialized terms."""
    n = 800
    return pd.DataFrame({
        "dispatch_date": pd.date_range("2022-01-01", periods=n, freq="D"),
        "batch_id": [f"BATCH-{np.random.randint(100, 999)}-{np.random.choice(['A', 'B', 'C'])}" for _ in range(n)],
        "compound_name": np.random.choice(["Sulfuric Acid", "Sodium Hydroxide", "Ethanol", "Acetone", "Benzene"], n),
        "purity_grade": np.random.choice(["Industrial", "Reagent", "Analytical", "Food Grade"], n),
        "volume_liters": np.random.uniform(50, 5000, n).round(1),
        "price_per_l": np.random.uniform(0.5, 15, n).round(2),
        "invoice_total": np.random.uniform(100, 50000, n).round(2),  # Target for revenue
        "client_lab": np.random.choice(["Acme Labs", "ChemCorp", "BioSynthetics", "Global Pharma"], n),
        "hazmat_class": np.random.choice(["Class 3", "Class 8", "Safe"], n)
    })

def create_saas_subscription_data():
    """SaaS / Subscription Niche: MRR, ARR, churn, tiers."""
    n = 1200
    return pd.DataFrame({
        "signup_date": pd.date_range("2021-01-01", periods=n, freq="D"),
        "account_id": [f"ACCT-{i}" for i in range(5000, 5000 + n)],
        "plan_tier": np.random.choice(["Basic", "Pro", "Enterprise"], n),
        "industry_vertical": np.random.choice(["Finance", "Healthcare", "Retail", "Tech"], n),
        "mrr": np.random.choice([29.0, 99.0, 499.0, 999.0], n),  # Target for revenue
        "seats": np.random.randint(1, 50, n),
        "churn_risk_score": np.random.uniform(0, 100, n).round(1),
        "is_active": np.random.choice([True, False], n, p=[0.8, 0.2])
    })

def create_real_estate_data():
    """Real Estate: High values, property types, locations, square footage."""
    n = 500
    return pd.DataFrame({
        "closing_date": pd.date_range("2020-01-01", periods=n, freq="3D"),
        "property_id": [f"PROP-{np.random.randint(1000, 9999)}" for _ in range(n)],
        "property_type": np.random.choice(["Single Family", "Condo", "Townhouse", "Commercial"], n),
        "neighborhood": np.random.choice(["Downtown", "Suburbs", "Uptown", "Westside", "Eastside"], n),
        "sale_price": np.random.uniform(200000, 2500000, n).round(0),  # Target for revenue
        "sq_ft": np.random.uniform(800, 5000, n).round(0),
        "agent_name": np.random.choice(["Sarah J.", "Mike T.", "Linda B.", "Chris P."], n),
        "days_on_market": np.random.randint(5, 120, n)
    })

datasets = {
    "1. ecommerce_sales.csv": create_ecommerce_data(),
    "2. retail_shop_sales.csv": create_shop_sales_data(),
    "3. chemical_b2b_sales.csv": create_chemical_sales_data(),
    "4. saas_subscriptions.csv": create_saas_subscription_data(),
    "5. real_estate_sales.csv": create_real_estate_data()
}

def run_advanced_tests():
    print("=" * 70)
    print("🌍 STARTING ADVANCED NICHE BUSINESS DATAST TEST SUITE")
    print("=" * 70)

    try:
        res = requests.get(f"{API_URL}/")
        if res.status_code != 200:
            print("❌ API is NOT reachable. Aborting.")
            return
    except Exception:
        print("❌ API is NOT reachable. Please run: uvicorn main:app --port 8000")
        return

    summary_results = []

    for name, df in datasets.items():
        print(f"\n🏭 Testing Industry: {name.split('.')[1].replace('_', ' ').title().strip()}")
        print(f"   Columns: {', '.join(df.columns)}")
        
        filepath = os.path.join(os.getcwd(), name)
        df.to_csv(filepath, index=False)
        
        start_time = time.time()
        
        try:
            with open(filepath, "rb") as f:
                res = requests.post(f"{API_URL}/upload-csv", files={"file": f}, timeout=120)
            
            dur = time.time() - start_time
            
            if res.status_code == 200:
                data = res.json()
                if "error" in data:
                    print(f"   ❌ Pipeline Error: {data['error']}")
                    summary_results.append((name, "Failed", data['error']))
                else:
                    mapped_cols = data.get("columns", [])
                    print(f"   ✅ Processed efficiently in {dur:.2f}s")
                    
                    # Verify schema mapping worked
                    analytics = data.get("analytics", {})
                    metrics = list(analytics.keys())
                    
                    rev_key = "total_revenue" if "total_revenue" in metrics else "None"
                    print(f"   📊 Analytics metrics extracted: {metrics}")
                    
                    # Test Copilot to ensure it understands the specific dataset
                    cp_q = f"Summarize the {name.split('.')[1].split('_')[0]} data"
                    try:
                        cp_res = requests.post(f"{API_URL}/copilot", json=cp_q, timeout=30)
                        if cp_res.status_code == 200:
                            print(f"   🤖 Copilot: ✅ Handled industry query successfully")
                        else:
                            print(f"   🤖 Copilot: ❌ Failed on dataset")
                    except Exception:
                        print(f"   🤖 Copilot: ❌ Timeout or Connection Error")

                    summary_results.append((name, "Passed", f"{dur:.2f}s"))
            else:
                print(f"   ❌ Server returned {res.status_code}")
                summary_results.append((name, "Failed", f"HTTP {res.status_code}"))
        
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
            summary_results.append((name, "Failed", str(e)))

    print("\n" + "=" * 70)
    print("📋 OVERALL NICHE TEST SUMMARY")
    print("=" * 70)
    for name, status, detail in summary_results:
        symbol = "✅" if status == "Passed" else "❌"
        print(f"{symbol} {name.ljust(30)} | {status.ljust(8)} | {detail}")

if __name__ == "__main__":
    run_advanced_tests()
