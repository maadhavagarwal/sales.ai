
import requests
import os
import time

BASE_URL = "http://127.0.0.1:8000"

def test_ai_pipeline():
    print("Testing AI Data Pipeline...")
    
    # 1. Create a dummy CSV
    csv_content = "date,revenue,cost,units\n2026-01-01,100,50,1\n2026-01-02,200,80,2\n2026-01-03,150,60,1.5"
    with open("test_pipeline.csv", "w") as f:
        f.write(csv_content)
    
    # 2. Upload
    print("Uploading test_pipeline.csv to /upload-csv...")
    files = {'file': ('test_pipeline.csv', open('test_pipeline.csv', 'rb'), 'text/csv')}
    response = requests.post(f"{BASE_URL}/upload-csv", files=files)
    if response.status_code != 200:
        print(f"Upload failed: {response.status_code} - {response.text}")
        return
    
    data = response.json()
    dataset_id = data.get("dataset_id")
    print(f"Dataset ID: {dataset_id}")
    print("Waiting 5s for background processing...")
    time.sleep(5)
    
    # 3. Test AI Pipeline Endpoints
    endpoints = [
        f"/ai/pricing/{dataset_id}",
        f"/ai/forecast/{dataset_id}",
        f"/ai/explain/{dataset_id}",
        f"/ai/strategy/{dataset_id}",
        f"/ai/clustering/{dataset_id}"
    ]
    
    # Post endpoints
    post_endpoints = [
        (f"/nlbi/{dataset_id}", {"question": "What is the total revenue?"}),
        (f"/copilot/{dataset_id}", "Summarize my data.") # Body is string as per @app.post("/copilot/{dataset_id}") async def ask_copilot(dataset_id: str, question: str = Body(...)):
    ]
    
    for ep in endpoints:
        print(f"Testing GET {ep}... ", end="")
        res = requests.get(f"{BASE_URL}{ep}")
        if res.status_code == 200:
            print("PASSED")
        else:
            print(f"FAILED ({res.status_code}) - {res.text[:100]}")

    for ep, payload in post_endpoints:
        print(f"Testing POST {ep}... ", end="")
        if isinstance(payload, str):
            res = requests.post(f"{BASE_URL}{ep}", json=payload)
        else:
            res = requests.post(f"{BASE_URL}{ep}", json=payload)
        
        if res.status_code == 200:
            print("PASSED")
        else:
            print(f"FAILED ({res.status_code}) - {res.text[:100]}")

if __name__ == "__main__":
    test_ai_pipeline()
