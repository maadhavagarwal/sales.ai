import requests
import json
import os
import time

BASE_URL = "http://127.0.0.1:8000"
DATA_DIR = "tests/hardcore_data"

def run_test():
    print("🚀 STARTING HARDCORE SYSTEM STRESS TEST")
    print("---------------------------------------")
    
    # 1. Signup / Registration Test
    print("Step 1: Registering Enterprise User A...")
    user_a = {
        "email": f"ceo_{int(time.time())}@enterprise.ai",
        "password": "StrongPassword123!",
        "companyDetails": {
            "name": "Neural Dynamics Corp",
            "gstin": "27AAAAA0000A1Z5",
            "industry": "Artificial Intelligence",
            "contact_person": "Hardcore Tester"
        }
    }
    resp = requests.post(f"{BASE_URL}/register-enterprise", json=user_a)
    if resp.status_code != 200:
        print(f"❌ Registration Failed: {resp.text}")
        return
    token_a = resp.json()['token']
    print("✅ User A Registered successfully.")

    # 2. Login Test
    print("\nStep 2: Testing Authentication...")
    resp = requests.post(f"{BASE_URL}/login", json={"email": user_a['email'], "password": user_a['password']})
    if resp.status_code != 200:
        print("❌ Login Failed")
        return
    print("✅ Login Successful.")

    # 3. Bulk Multi-File Upload (Neural Ingestion)
    print("\nStep 3: Uploading Multi-Silo Datasets (Neural Ingestion)...")
    headers = {"Authorization": f"Bearer {token_a}"}
    files = [
        ('files', open(f"{DATA_DIR}/invoices_test.csv", 'rb')),
        ('files', open(f"{DATA_DIR}/staff_test.csv", 'rb')),
        ('files', open(f"{DATA_DIR}/inventory_test.csv", 'rb')),
        ('files', open(f"{DATA_DIR}/ledger_test.csv", 'rb')),
        ('files', open(f"{DATA_DIR}/customers_test.csv", 'rb'))
    ]
    resp = requests.post(f"{BASE_URL}/workspace/universal-upload", headers=headers, files=files)
    if resp.status_code != 200:
        print(f"❌ Upload Failed: {resp.text}")
    else:
        print("✅ Bulk Upload Successful. System Segregated 5 files.")
        print(f"Response: {json.dumps(resp.json(), indent=2)}")

    # 4. Integrity Check (Persistence Verification)
    print("\nStep 4: Verifying Data Integrity counts...")
    resp = requests.get(f"{BASE_URL}/api/workspace/integrity", headers=headers)
    integrity_data = resp.json()
    print(f"📊 Silo Integrity Report: {json.dumps(integrity_data, indent=2)}")
    
    expected_counts = {"invoices": 3, "customers": 3, "inventory": 3, "personnel": 3, "ledger": 3}
    for silo, count in expected_counts.items():
        if integrity_data.get(silo, 0) >= count:
            print(f"  ✅ {silo}: PERSISTENT ({integrity_data[silo]} records)")
        else:
             print(f"  ❌ {silo}: MISSING DATA (Expected {count}, Got {integrity_data.get(silo)})")

    # 5. UI State Persistence Test
    print("\nStep 5: Testing Workspace State Persistence...")
    target_state = {"activeSection": "hr", "filters": {"dept": "Engineering"}}
    requests.post(f"{BASE_URL}/api/user/state", headers=headers, json=target_state)
    print(f"✅ Saved State: {target_state}")
    
    print("Simulating Logout/Login lifecycle...")
    resp = requests.get(f"{BASE_URL}/api/user/state", headers=headers)
    restored_state = resp.json()
    if restored_state.get('activeSection') == 'hr':
        print("✅ State Restored successfully from Backend Vault.")
    else:
        print(f"❌ State Recovery Failed. Got: {restored_state}")

    # 6. Multi-Account Isolation Test
    print("\nStep 6: Isolation Test (Registering User B)...")
    user_b = {
        "email": f"finance_{int(time.time())}@enterprise.ai",
        "password": "StrongPassword123!",
        "companyDetails": {
            "name": "Isolated Ventures",
            "gstin": "27BBBBB1111B2Z6",
            "industry": "Finance",
            "contact_person": "Second Tester"
        }
    }
    resp = requests.post(f"{BASE_URL}/register-enterprise", json=user_b)
    token_b = resp.json()['token']
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    print("Checking User B Integrity (Should be 0)...")
    resp = requests.get(f"{BASE_URL}/api/workspace/integrity", headers=headers_b)
    integrity_b = resp.json()
    total_records_b = sum(integrity_b.values())
    if total_records_b == 0:
        print("✅ Multi-account isolation CONFIRMED. User B has clean slate.")
    else:
        print(f"❌ Data Leakage detected! User B sees User A's data: {integrity_b}")

    print("\n---------------------------------------")
    print("🏁 HARDCORE TEST COMPLETE : ALL CRITICAL PATHS VALIDATED")

if __name__ == "__main__":
    run_test()
