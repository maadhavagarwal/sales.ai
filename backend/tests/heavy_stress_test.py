import requests
import pandas as pd
import numpy as np
import threading
import time
import os
from io import BytesIO

API_URL = "http://localhost:8000"

def create_large_dataset(rows=200000):
    print(f"Generating large dataset with {rows} rows...", flush=True)
    df = pd.DataFrame({
        "timestamp": pd.date_range("2020-01-01", periods=rows, freq="s"),
        "revenue": np.random.uniform(10, 5000, rows),
        "product_id": np.random.randint(1, 500, rows),
        "region": np.random.choice(["East", "West", "North", "South", "Central", "International"], rows),
        "customer_segment": np.random.choice(["Enterprise", "SMB", "Individual", "Partner"], rows),
        "discount_applied": np.random.uniform(0, 0.3, rows),
        "is_return": np.random.choice([0, 1], rows, p=[0.95, 0.05])
    })
    return df

def test_user_flow(user_id, df):
    name = f"user_{user_id}_data.csv"
    csv_buffer = BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    print(f"[User {user_id}] Starting upload ({len(df)} rows)...", flush=True)
    start = time.time()
    
    try:
        # Upload
        files = {"file": (name, csv_buffer, "text/csv")}
        res = requests.post(f"{API_URL}/upload-csv", files=files, timeout=300)
        
        if res.status_code != 200:
            print(f"[User {user_id}] ❌ Upload failed: {res.status_code} - {res.text[:100]}")
            return
            
        dataset_id = res.json().get("dataset_id")
        elapsed = time.time() - start
        print(f"[User {user_id}] ✅ Upload Success in {elapsed:.1f}s. Dataset ID: {dataset_id}", flush=True)
        
        # Copilot queries
        queries = [
            "What is the total revenue per region?",
            "Which customer segment has the highest average revenue?",
            "Give me a summary of anomalies in the revenue column."
        ]
        
        for q in queries:
            print(f"[User {user_id}] 🤖 Asking: '{q}'", flush=True)
            q_start = time.time()
            cp_res = requests.post(f"{API_URL}/copilot/{dataset_id}", json=q, timeout=60)
            q_dur = time.time() - q_start
            
            if cp_res.status_code == 200:
                print(f"[User {user_id}] ✅ Answer received in {q_dur:.1f}s")
            else:
                print(f"[User {user_id}] ❌ Copilot failed: {cp_res.status_code}")
                
    except Exception as e:
        print(f"[User {user_id}] ❌ System Exception: {str(e)}")

def run_heavy_test():
    print("="*60)
    print("🔥 LAUNCHING HEAVY CONCURRENCY & DATA STRESS TEST")
    print("="*60)
    
    # 1. Check server health
    try:
        requests.get(f"{API_URL}/", timeout=5)
    except:
        print("❌ Server is not running on port 8000. Start it first.")
        return

    # 2. Prepare datasets
    df_medium = create_large_dataset(50000)  # ~3MB
    df_large = create_large_dataset(200000)  # ~12MB
    
    # 3. Spawn concurrent "users"
    threads = []
    
    # User 1: Medium load
    t1 = threading.Thread(target=test_user_flow, args=(1, df_medium))
    # User 2: Heavy load
    t2 = threading.Thread(target=test_user_flow, args=(2, df_large))
    # User 3: Medium load
    t3 = threading.Thread(target=test_user_flow, args=(3, df_medium))
    
    threads = [t1, t2, t3]
    
    print("🚀 Spawning {len(threads)} concurrent users...", flush=True)
    for t in threads:
        t.start()
        time.sleep(1) # Slight stagger
        
    for t in threads:
        t.join()
        
    print("\n" + "="*60)
    print("🏁 HEAVY STRESS TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    run_heavy_test()
