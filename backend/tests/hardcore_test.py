"""
Hardcore Test Suite for AI Data Platform
Tests the API and data pipeline against various edge cases:
1. Standard Sales Dataset
2. Product Catalog (No dates, no regions)
3. Customer Dataset (Strings, IDs, boolean, sparse numbers)
4. Massive Dataset (50,000 rows to test performance & timeouts)
5. Dirty Dataset (Extreme NaN values, infinite values, weird characters)
6. Copilot stress test
"""
import pandas as pd
import numpy as np
import requests
import time
import json
import warnings

warnings.filterwarnings('ignore')

API_URL = "http://localhost:8000"

def create_sales_dataset():
    np.random.seed(42)
    n = 1000
    return pd.DataFrame({
        "order_date": pd.date_range("2023-01-01", periods=n, freq="h"),
        "product_name": np.random.choice(["Laptop X", "Phone Y", "Tablet Z", "Headphones", "Monitor"], n),
        "location": np.random.choice(["New York", "London", "Tokyo", "Berlin"], n),
        "total_sales_amount": np.random.uniform(50, 5000, n).round(2),
        "qty": np.random.randint(1, 10, n),
        "user_id": np.random.randint(1000, 9999, n)
    })

def create_product_dataset():
    n = 500
    return pd.DataFrame({
        "item_sku": [f"SKU-{i}" for i in range(10000, 10000 + n)],
        "category": np.random.choice(["Electronics", "Clothing", "Home", "Sports"], n),
        "retail_price": np.random.uniform(10, 500, n).round(2),
        "cost_price": np.random.uniform(5, 200, n).round(2),
        "customer_rating": np.random.uniform(1, 5, n).round(1),
        "in_stock": np.random.choice([True, False], n),
        "reviews_count": np.random.randint(0, 1000, n)
    })

def create_dirty_dataset():
    n = 1000
    df = pd.DataFrame({
        "Weird Date!@#": pd.date_range("2023-01-01", periods=n, freq="D").astype(str),
        " Rev??  ": np.random.uniform(10, 500, n),
        "Prod": np.random.choice(["A", "B", None, np.nan], n),
        "qty": np.random.choice([1, 2, 3, np.nan, np.inf], n)
    })
    # Corrupt some dates
    df.loc[0, "Weird Date!@#"] = "Not a date"
    df.loc[10:20, " Rev??  "] = np.nan
    return df

def create_massive_dataset():
    n = 50000
    return pd.DataFrame({
        "date": pd.date_range("2020-01-01", periods=n, freq="min"),
        "revenue": np.random.uniform(10, 1000, n).round(2),
        "product": np.random.choice(["Prod A", "Prod B", "Prod C"], n),
        "region": np.random.choice(["North", "South", "East", "West"], n)
    })

datasets = {
    "1. standard_sales.csv": create_sales_dataset(),
    "2. product_catalog.csv": create_product_dataset(),
    "3. dirty_data.csv": create_dirty_dataset(),
    "4. massive_data.csv": create_massive_dataset()
}

def run_tests():
    print("=" * 60)
    print("🚀 STARTING HARDCORE SYSTEM TEST")
    print("=" * 60)

    # Check if API is running
    try:
        res = requests.get(f"{API_URL}/")
        if res.status_code == 200:
            print("✅ API is reachable")
        else:
            print(f"❌ API returned {res.status_code}")
            return
    except Exception as e:
        print(f"❌ API is NOT reachable: {e}")
        print("Please start the backend server: uvicorn main:app --port 8000")
        return

    for name, df in datasets.items():
        print(f"\n📁 Testing Dataset: {name} ({len(df)} rows)")
        df.to_csv(name, index=False)
        
        start_time = time.time()
        print("   Upload & Processing started...")
        
        try:
            with open(name, "rb") as f:
                res = requests.post(f"{API_URL}/upload-csv", files={"file": f}, timeout=120)
            
            dur = time.time() - start_time
            
            if res.status_code == 200:
                data = res.json()
                if "error" in data:
                    print(f"   ❌ Server Side Error: {data['error']} ({dur:.1f}s)")
                else:
                    print(f"   ✅ Success in {dur:.1f}s")
                    dataset_id = data.get("dataset_id")
                    print(f"      Rows processed: {data.get('rows')}")
                    print(f"      Keys returned: {list(data.keys())}")
                    
                    # Test Copilot
                    print("   🤖 Testing Copilot...")
                    cp_res = requests.post(f"{API_URL}/copilot/{dataset_id}", json="summarize the data", timeout=30)
                    if cp_res.status_code == 200:
                        cp_data = cp_res.json()
                        ans = cp_data.get('answer', str(cp_data)).replace('\n', ' ')
                        print(f"      ✅ Q: 'summarize' -> {ans[:80]}...")
                    else:
                        print(f"      ❌ Copilot failed: {cp_res.status_code}")
                        
                    # Test NLBI
                    if "dirty" not in name:
                        print("   📊 Testing NLBI...")
                        nlbi_res = requests.post(f"{API_URL}/nlbi/{dataset_id}", json="chart the top products", timeout=30)
                        if nlbi_res.status_code == 200:
                            print(f"      ✅ Chart generated successfully")
                        else:
                            print(f"      ❌ NLBI failed: {nlbi_res.status_code}")
            else:
                print(f"   ❌ HTTP Error {res.status_code}: {res.text[:100]} ({dur:.1f}s)")
        except Exception as e:
             dur = time.time() - start_time
             print(f"   ❌ Request failed: {str(e)} ({dur:.1f}s)")

    print("\n🎉 HARDCORE TESTING COMPLETE")

if __name__ == "__main__":
    run_tests()
