import requests
import json
import os
import time

BASE_URL = "http://127.0.0.1:8080"
DATA_DIR = "tests/hardcore_data"

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def run_test():
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "steps": []
    }
    
    def add_step(name, success, info):
        report["steps"].append({"name": name, "success": success, "info": info})
        status = "✅" if success else "❌"
        log(f"{status} {name}: {info}")

    log("🚀 STARTING HARDCORE SYSTEM STRESS TEST")
    
    try:
        # 1. Signup
        ts = int(time.time())
        user_a = {
            "email": f"ceo_{ts}@tesla.com",
            "password": "PersistenceTest123",
            "companyDetails": {
                "name": f"Tesla Enterprise {ts}",
                "gstin": "27AAAAA0000A1Z5",
                "industry": "Automotive",
                "contact_person": "Elon Musk"
            }
        }
        resp = requests.post(f"{BASE_URL}/register-enterprise", json=user_a)
        if resp.status_code == 200:
            token_a = resp.json()['token']
            add_step("Enterprise Registration", True, f"User {user_a['email']} registered.")
        else:
            add_step("Enterprise Registration", False, f"Status {resp.status_code}: {resp.text}")
            return report

        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Bulk Upload
        files_to_upload = [
            ('files', (f'invoices_{ts}.csv', open(f"{DATA_DIR}/invoices_test.csv", 'rb'), 'text/csv')),
            ('files', (f'staff_{ts}.csv', open(f"{DATA_DIR}/staff_test.csv", 'rb'), 'text/csv')),
            ('files', (f'inventory_{ts}.csv', open(f"{DATA_DIR}/inventory_test.csv", 'rb'), 'text/csv')),
            ('files', (f'ledger_{ts}.csv', open(f"{DATA_DIR}/ledger_test.csv", 'rb'), 'text/csv')),
            ('files', (f'customers_{ts}.csv', open(f"{DATA_DIR}/customers_test.csv", 'rb'), 'text/csv'))
        ]
        resp = requests.post(f"{BASE_URL}/workspace/universal-upload", headers=headers_a, files=files_to_upload)
        if resp.status_code == 200:
            add_step("Neural Ingestion (Bulk)", True, "5 files segregated and persistent.")
        else:
            add_step("Neural Ingestion (Bulk)", False, f"Status {resp.status_code}: {resp.text}")

        # 3. Integrity Verification
        resp = requests.get(f"{BASE_URL}/api/workspace/integrity", headers=headers_a)
        integrity = resp.json()
        total_records = sum(integrity.values())
        if total_records >= 15:
            add_step("Data Integrity", True, f"Total persistent records: {total_records}")
        else:
            add_step("Data Integrity", False, f"Only found {total_records} records.")

        # 4. State Persistence
        target_state = {"activeSection": "finance", "theme": "dark"}
        requests.post(f"{BASE_URL}/api/user/state", headers=headers_a, json=target_state)
        time.sleep(1) # Wait for flush
        resp = requests.get(f"{BASE_URL}/api/user/state", headers=headers_a)
        if resp.json().get('activeSection') == 'finance':
            add_step("State Persistence", True, "Workspace 'finance' section recovered from cloud vault.")
        else:
            add_step("State Persistence", False, f"Incorrect state recovered: {resp.text}")

        # 5. Logout/Account Isolation
        user_b = {
            "email": f"isolated_{ts}@mars.com",
            "password": "PersistenceTest123",
            "companyDetails": {
                "name": f"SpaceX {ts}",
                "gstin": "27BBBBB1111B2Z6",
                "industry": "Aerospace",
                "contact_person": "Gwynne Shotwell"
            }
        }
        resp = requests.post(f"{BASE_URL}/register-enterprise", json=user_b)
        token_b = resp.json()['token']
        headers_b = {"Authorization": f"Bearer {token_b}"}
        
        resp = requests.get(f"{BASE_URL}/api/workspace/integrity", headers=headers_b)
        if sum(resp.json().values()) == 0:
            add_step("Account Isolation", True, "User B has zero leakage from User A.")
        else:
            add_step("Account Isolation", False, f"Unexpected data found for User B: {resp.json()}")

    except Exception as e:
        add_step("System Crash Test", False, str(e))
    
    with open("tests/hardcore_report.json", "w") as f:
        json.dump(report, f, indent=4)
    return report

if __name__ == "__main__":
    run_test()
