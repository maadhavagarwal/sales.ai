import pandas as pd
import numpy as np
import requests
import time
import os
from io import BytesIO

API_URL = "http://localhost:8000"

def generate_mix_business_data(rows, filename):
    print(f"--- Generating {filename} with {rows} rows ---", flush=True)
    
    # Diverse categories for "Mix Business"
    categories = [
        "Electronics", "Chemicals", "SaaS", "Retail", "Industrial", 
        "Automotive", "Healthcare", "Aerospace", "Textiles", "Energy"
    ]
    regions = ["NA", "EMEA", "APAC", "LATAM", "Global"]
    
    start_time = time.time()
    
    # Efficiently generate data
    df = pd.DataFrame({
        "Date": pd.date_range("2010-01-01", periods=rows, freq="min"),
        "Business_Vertical": np.random.choice(categories, rows),
        "Region": np.random.choice(regions, rows),
        "SKU": [f"SKU-{i%10000}" for i in range(rows)],
        "Transaction_Value": np.random.uniform(5.0, 50000.0, rows).round(2),
        "Quantity": np.random.randint(1, 100, rows),
        "Customer_Type": np.random.choice(["B2B", "B2C", "Government", "Enterprise"], rows)
    })
    
    gen_time = time.time() - start_time
    print(f"   Done generating in {gen_time:.1f}s. Saving to file...", flush=True)
    
    df.to_csv(filename, index=False)
    print(f"   Saved {filename} ({os.path.getsize(filename)/(1024*1024):.1f} MB)", flush=True)
    return filename

def test_dataset(filename):
    print(f"\n🚀 Testing API with {filename}", flush=True)
    
    # Pre-flight check
    try:
        requests.get(f"{API_URL}/", timeout=5)
    except:
        print("   ❌ CRITICAL: Server is down before starting this test.", flush=True)
        return

    start_time = time.time()
    
    try:
        with open(filename, "rb") as f:
            print("   Uploading...", flush=True)
            res = requests.post(f"{API_URL}/upload-csv", files={"file": f}, timeout=1200) # 20 min timeout for massive data
            
        if res.status_code == 200:
            data = res.json()
            if "error" in data:
                print(f"   ❌ API Error: {data['error']}", flush=True)
            else:
                dur = time.time() - start_time
                print(f"   ✅ SUCCESS in {dur:.1f}s", flush=True)
                dataset_id = data.get("dataset_id")
                print(f"      Rows: {data.get('rows')}", flush=True)
                
                # Verify Copilot on this huge data
                print("   🤖 Stress Testing Copilot...", flush=True)
                cp_start = time.time()
                cp_res = requests.post(f"{API_URL}/copilot/{dataset_id}", 
                                      json="What are the top 3 high-value business verticals in this dataset?", 
                                      timeout=120)
                if cp_res.status_code == 200:
                    print(f"      ✅ Copilot answered in {time.time()-cp_start:.1f}s", flush=True)
                else:
                    print(f"      ❌ Copilot failed: {cp_res.status_code}", flush=True)
        else:
            print(f"   ❌ Upload failed: {res.status_code} - {res.text[:100]}", flush=True)
            
    except Exception as e:
        print(f"   ❌ Request failed: {str(e)}", flush=True)

def run_mega_test():
    print("="*80)
    print("MEGA SCALE DATASET TEST - NEURAL BI ENTERPRISE")
    print("="*80)
    
    test_specs = [
        (200000, "mega_200k.csv"),
        (500000, "mega_500k.csv"),
        (1000001, "mega_1M.csv"),
        (3000000, "mega_3M.csv")
    ]
    
    for rows, fname in test_specs:
        generate_mix_business_data(rows, fname)
        test_dataset(fname)
        
        # Cleanup to save user disk space
        if os.path.exists(fname):
            os.remove(fname)
            print(f"   Cleanup: Removed {fname}", flush=True)

if __name__ == "__main__":
    run_mega_test()
