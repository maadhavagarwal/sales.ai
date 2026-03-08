import os
import requests
import time
import pandas as pd

API_URL = "http://127.0.0.1:8000"
DATA_DIR = "data"

def test_file(filepath):
    filename = os.path.basename(filepath)
    print(f"\n🚀 Testing with {filename}", flush=True)
    
    # Pre-flight check
    try:
        requests.get(f"{API_URL}/", timeout=5).raise_for_status()
    except Exception as e:
        print(f"   ❌ CRITICAL: Server is down. ({e})", flush=True)
        return

    start_time = time.time()
    
    try:
        with open(filepath, "rb") as f:
            print(f"   Uploading {filename}...", flush=True)
            res = requests.post(f"{API_URL}/upload-csv", files={"file": f}, timeout=1200) 
            
        if res.status_code == 200:
            data = res.json()
            if "error" in data:
                print(f"   ❌ API Error: {data['error']}", flush=True)
            else:
                dur = time.time() - start_time
                print(f"   ✅ SUCCESS in {dur:.1f}s", flush=True)
                dataset_id = data.get("dataset_id")
                print(f"      Rows: {data.get('rows')}", flush=True)
                
                # Basic Copilot Test
                print("   🤖 Querying Copilot...", flush=True)
                cp_start = time.time()
                # Assuming copilot endpoint takes question text
                cp_res = requests.post(f"{API_URL}/copilot/{dataset_id}", 
                                      json="Summarize the key trends in this data.", 
                                      timeout=60)
                if cp_res.status_code == 200:
                    print(f"      ✅ Copilot answered in {time.time()-cp_start:.1f}s", flush=True)
                else:
                    print(f"      ❌ Copilot failed: {cp_res.status_code}", flush=True)
        else:
            print(f"   ❌ Upload failed: {res.status_code} - {res.text[:100]}", flush=True)
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}", flush=True)

def main():
    if not os.path.exists(DATA_DIR):
        print(f"Data directory {DATA_DIR} not found.")
        return

    extensions = ('.csv', '.xlsx', '.xls')
    files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith(extensions)]
    print(f"Found {len(files)} data files in {DATA_DIR}.")
    
    for f in sorted(files):
        test_file(os.path.join(DATA_DIR, f))

if __name__ == "__main__":
    main()
