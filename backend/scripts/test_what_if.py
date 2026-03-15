import requests
import json
import jwt
import time

SECRET_KEY = "INSECURE_DEV_KEY_CHANGE_IN_PRODUCTION"
ALGORITHM = "HS256"

def generate_test_token():
    payload = {
        "id": 1,
        "email": "ceo_1773578001@tesla.com",
        "role": "ADMIN",
        "company_id": "STRESS_TEST_001",
        "exp": time.time() + 3600
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def test_what_if():
    url = "http://127.0.0.1:8000/ai/intelligence/what-if"
    token = generate_test_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    data = {
        "query": "What if we lose our biggest customer?"
    }
    
    print(f"Testing What-If Simulator with query: '{data['query']}'")
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    test_what_if()
