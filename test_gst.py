import requests
BASE_URL = "http://localhost:8000"
res = requests.get(f"{BASE_URL}/workspace/accounting/gst")
print(f"Status: {res.status_code}")
print(f"Response: {res.text}")
