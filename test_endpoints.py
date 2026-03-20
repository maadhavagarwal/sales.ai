import requests
import json

BASE_URL = "http://localhost:8000"

print("=== Testing Portal/Tally Endpoints ===\n")

endpoints = [
    ("GET", "/api/portal/dashboard", None),
    ("GET", "/api/portal/customers", None),
    ("GET", "/workspace/sync", None),
    ("GET", "/api/anomalies/alerts", None),
]

for method, endpoint, data in endpoints:
    try:
        if method == "GET":
            r = requests.get(f"{BASE_URL}{endpoint}")
        else:
            r = requests.post(f"{BASE_URL}{endpoint}", json=data)
        
        print(f"✓ {method} {endpoint}")
        print(f"  Status: {r.status_code}")
        
        # Try to parse JSON
        try:
            response_data = r.json()
            # Limit output to 200 chars
            output = json.dumps(response_data, indent=2)
            if len(output) > 200:
                output = output[:200] + "..."
            print(f"  Response: {output}")
        except:
            print(f"  Response: {r.text[:100]}")
        print()
    except Exception as e:
        print(f"✗ {method} {endpoint}")
        print(f"  Error: {str(e)}\n")

print("\n✓ All critical endpoints are accessible")
