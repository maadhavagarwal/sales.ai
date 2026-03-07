"""
Uncommon & Mixed Sales Data Test Suite
Tests the platform against highly unusual, mixed, or service-based businesses.
"""
import pandas as pd
import numpy as np
import requests
import time
import os
import warnings

warnings.filterwarnings('ignore')

API_URL = "http://localhost:8000"

def create_paint_shop_data():
    """Paint Shop: Mixed content (services + products), mixing ratios, finishes."""
    n = 1000
    dates = pd.date_range("2023-01-01", periods=n, freq="D")
    return pd.DataFrame({
        "invoice_date": dates,
        "item_desc": np.random.choice(["Matte White Base", "Glossy Enamel", "Custom Mix (Blue)", "Primer 5L", "Brushes Set"], n),
        "service_added": np.random.choice(["None", "Color Matching", "Delivery", "In-home Consult"], n),
        "job_type": np.random.choice(["Residential", "Commercial", "Auto", "Industrial"], n),
        "liter_volume": np.random.uniform(1, 50, n).round(1),
        "material_cost": np.random.uniform(10, 200, n).round(2),
        "billed_amount": np.random.uniform(50, 800, n).round(2),  # Target for revenue
        "contractor_id": [f"PAINT-{np.random.randint(100, 999)}" for _ in range(n)]
    })

def create_stationery_shop_data():
    """Stationery Shop: High volume of extreme low-cost items, mixed with bulk school orders."""
    n = 2500
    dates = pd.date_range("2023-08-01", periods=n, freq="h")
    return pd.DataFrame({
        "timestamp": dates,
        "sku_name": np.random.choice(["Gel Pen (Black)", "A4 Paper Ream", "Eraser", "Geometry Box", "Binders (10pk)", "Stapler"], n),
        "customer_type": np.random.choice(["Walk-in", "School Bulk", "Office Corp", "Teacher"], n, p=[0.6, 0.2, 0.15, 0.05]),
        "qty_sold": np.random.choice([1, 2, 5, 50, 100, 500], n, p=[0.5, 0.2, 0.1, 0.1, 0.05, 0.05]),
        "unit_price": np.random.uniform(0.10, 25.0, n).round(2),
        "total_receipt": np.random.uniform(0.10, 1500.0, n).round(2),  # Target for revenue
        "payment_type": np.random.choice(["Cash", "Card", "School PO"], n)
    })

def create_it_firm_data():
    """IT Firm Sales: Intangible services, billing hours, retainers, licenses."""
    n = 800
    return pd.DataFrame({
        "billing_period": pd.date_range("2023-01-01", periods=n, freq="W"),
        "client_name": np.random.choice(["TechStart", "MegaCorp", "LocalBank", "CityGov"], n),
        "service_line": np.random.choice(["Cloud Migration", "Cyber Audit", "App Dev", "Monthly Retainer", "O365 Licenses"], n),
        "billable_hours": np.random.choice([0, 10, 40, 100, 250], n),
        "hourly_rate": np.random.choice([0, 150, 200, 300], n),
        "software_cost": np.random.uniform(0, 5000, n).round(2),
        "invoice_value": np.random.uniform(1000, 50000, n).round(2),  # Target for revenue
        "project_status": np.random.choice(["Ongoing", "Completed", "On Hold"], n)
    })

def create_scrap_metal_data():
    """Scrap Yard: Weights instead of quantity, payout vs sale, unusual metrics."""
    n = 1200
    return pd.DataFrame({
        "weigh_in_date": pd.date_range("2023-01-01", periods=n, freq="D"),
        "material_type": np.random.choice(["Copper Wire", "Aluminum Cans", "Steel Scrap", "Brass", "Cast Iron"], n),
        "gross_weight_lbs": np.random.uniform(50, 5000, n).round(1),
        "tare_weight_lbs": np.random.uniform(0, 500, n).round(1),
        "net_weight_lbs": np.random.uniform(50, 4500, n).round(1),
        "price_per_lb": np.random.uniform(0.05, 3.50, n).round(2),
        "payout_total": np.random.uniform(10, 5000, n).round(2),  # Target for revenue/paid
        "supplier_type": np.random.choice(["Public Walk-in", "Demolition Co", "Plumber", "Electrician"], n)
    })

def create_event_ticketing_data():
    """Event Ticketing: Capacity, seat tiers, scalper detection."""
    n = 3000
    return pd.DataFrame({
        "purchase_time": pd.date_range("2023-10-01", periods=n, freq="min"),
        "event_name": np.random.choice(["Rock Fest '24", "Symphony Orchestra", "Comedy Night", "Tech Expo"], n),
        "ticket_tier": np.random.choice(["VIP", "General Admin", "Balcony", "Early Bird"], n),
        "tickets_bought": np.random.randint(1, 8, n),
        "face_value": np.random.choice([25, 50, 150, 300], n),
        "service_fee": np.random.uniform(5, 45, n).round(2),
        "total_charge": np.random.uniform(30, 2500, n).round(2),  # Target for revenue
        "buyer_location": np.random.choice(["Local", "Out of State", "International"], n),
        "is_reseller": np.random.choice([True, False], n, p=[0.05, 0.95])
    })

datasets = {
    "1. paint_shop_mixed.csv": create_paint_shop_data(),
    "2. stationery_micro_sales.csv": create_stationery_shop_data(),
    "3. it_firm_services.csv": create_it_firm_data(),
    "4. scrap_metal_yard.csv": create_scrap_metal_data(),
    "5. event_ticketing.csv": create_event_ticketing_data()
}

def run_uncommon_tests():
    print("=" * 75)
    print("🛠️  STARTING UNCOMMON & MIXED SALES DATA TEST SUITE")
    print("=" * 75)

    try:
        res = requests.get(f"{API_URL}/")
        if res.status_code != 200:
            print("❌ API is NOT reachable. Aborting.")
            return
    except Exception:
        print("❌ API is NOT reachable. Please run: uvicorn main:app --port 8000")
        return

    summary = []

    for name, df in datasets.items():
        industry = name.split('.')[1].replace('_', ' ').title().strip()
        print(f"\n🏬 Testing: {industry}")
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
                    summary.append((name, "Failed", data['error']))
                else:
                    print(f"   ✅ Processed successfully in {dur:.2f}s")
                    
                    analytics = data.get("analytics", {})
                    metrics = list(analytics.keys())
                    print(f"   📊 AI extracted metrics: {metrics}")
                    
                    # Test Copilot understanding
                    cp_q = f"What is the total revenue or billed amount for {industry}?"
                    try:
                        cp_res = requests.post(f"{API_URL}/copilot", json=cp_q, timeout=30)
                        if cp_res.status_code == 200:
                            ans = cp_res.json().get('answer', '')[:100].replace('\n', ' ')
                            print(f"   🤖 Copilot understood: '{ans}...'")
                        else:
                            print(f"   🤖 Copilot API Error: {cp_res.status_code}")
                    except Exception:
                        print(f"   🤖 Copilot Connection Error")

                    summary.append((name, "Passed", f"{dur:.2f}s"))
            else:
                print(f"   ❌ Server returned {res.status_code}: {res.text[:100]}")
                summary.append((name, "Failed", f"HTTP {res.status_code}"))
        
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
            summary.append((name, "Failed", str(e)))

    print("\n" + "=" * 75)
    print("📋 UNCOMMON DATA TEST SUMMARY")
    print("=" * 75)
    for name, status, detail in summary:
        symbol = "✅" if status == "Passed" else "❌"
        print(f"{symbol} {name.ljust(35)} | {status.ljust(8)} | {detail}")

if __name__ == "__main__":
    run_uncommon_tests()
