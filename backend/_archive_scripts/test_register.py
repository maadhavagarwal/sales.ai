import requests
import json

url = "http://localhost:8000/register-enterprise"
data = {
    "email": "test_user_new@example.com",
    "password": "Password123!",
    "companyDetails": {
        "name": "Test Company",
        "contact_person": "Test Person",
        "gstin": "27AAAAA0000A1Z5",
        "industry": "Technology",
        "size": "1-10",
        "hq_location": "Delhi",
        "phone": "9999999999",
        "business_type": "Other"
    }
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
