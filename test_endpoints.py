#!/usr/bin/env python3
"""
Test script to verify all newly added backend endpoints are working correctly.
Tests CRM, Audit Logs, Documents, and Health Score endpoints.
"""

import requests
import json
from datetime import datetime, timedelta
import sys

API_BASE = "http://localhost:8000"
TEST_TOKEN = "test_token_12345"  # This should match a valid token for testing

def get_headers(token=TEST_TOKEN):
    """Generate auth headers."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_endpoint(method, endpoint, description, data=None, expected_status=200):
    """Test a single endpoint."""
    url = f"{API_BASE}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Endpoint: {method} {endpoint}")
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=get_headers())
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=get_headers())
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=get_headers())
        else:
            print(f"❌ Unsupported method: {method}")
            return False
        
        print(f"Status Code: {response.status_code} (expected {expected_status})")
        
        if response.status_code == expected_status:
            try:
                response_json = response.json()
                print(f"✅ PASSED")
                print(f"Response Sample: {json.dumps(response_json, indent=2)[:200]}...")
                return True
            except:
                print(f"✅ PASSED (non-JSON response)")
                return True
        else:
            print(f"❌ FAILED")
            print(f"Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False

def run_tests():
    """Run all endpoint tests."""
    print("=" * 60)
    print("BACKEND ENDPOINT VERIFICATION TESTS")
    print("=" * 60)
    
    results = {}
    
    # ===== CRM ENDPOINTS =====
    print("\n" + "="*60)
    print("CRM MODULE TESTS")
    print("="*60)
    
    # Get deals
    results["GET /workspace/crm/deals"] = test_endpoint(
        "GET", "/workspace/crm/deals",
        "Get all CRM deals"
    )
    
    # Create deal
    deal_data = {
        "deal_name": "Test Deal",
        "customer_id": "CUST-001",
        "value": 50000.0,
        "stage": "QUALIFIED",
        "probability": 0.5,
        "expected_close_date": (datetime.now() + timedelta(days=30)).isoformat()
    }
    results["POST /workspace/crm/deals"] = test_endpoint(
        "POST", "/workspace/crm/deals",
        "Create a new CRM deal",
        data=deal_data,
        expected_status=200
    )
    
    # Update deal (using a dummy deal_id)
    update_data = {"stage": "PROPOSAL", "probability": 0.7}
    results["PUT /workspace/crm/deals/{id}"] = test_endpoint(
        "PUT", "/workspace/crm/deals/DEAL-TESTID01",
        "Update an existing CRM deal",
        data=update_data,
        expected_status=200
    )
    
    # Get health scores
    results["GET /crm/health-scores"] = test_endpoint(
        "GET", "/crm/health-scores",
        "Get customer health scores"
    )
    
    # Get predictive insights
    results["GET /crm/predictive-insights"] = test_endpoint(
        "GET", "/crm/predictive-insights",
        "Get CRM predictive insights"
    )
    
    # ===== AUDIT LOG ENDPOINTS =====
    print("\n" + "="*60)
    print("AUDIT LOG MODULE TESTS")
    print("="*60)
    
    # Get audit logs
    results["GET /workspace/audit-logs"] = test_endpoint(
        "GET", "/workspace/audit-logs",
        "Get company audit logs"
    )
    
    # Create audit log
    log_data = {
        "action": "CREATE_DEAL",
        "module": "CRM",
        "details": "Created new deal - Test Deal"
    }
    results["POST /workspace/audit-logs"] = test_endpoint(
        "POST", "/workspace/audit-logs",
        "Create an audit log entry",
        data=log_data,
        expected_status=200
    )
    
    # ===== DOCUMENT ENDPOINTS =====
    print("\n" + "="*60)
    print("DOCUMENT MODULE TESTS")
    print("="*60)
    
    # List documents
    results["GET /api/documents"] = test_endpoint(
        "GET", "/api/documents",
        "List all generated documents"
    )
    
    # List templates
    results["GET /api/documents/templates/list"] = test_endpoint(
        "GET", "/api/documents/templates/list",
        "List document templates"
    )
    
    # Generate document
    generate_data = {
        "doc_type": "sales_report",
        "title": "Monthly Sales Report",
        "format": "pdf"
    }
    results["POST /api/documents/generate"] = test_endpoint(
        "POST", "/api/documents/generate",
        "Generate a new document (PDF)",
        data=generate_data,
        expected_status=200
    )
    
    # Generate DOCX document
    generate_data["format"] = "docx"
    results["POST /api/documents/generate (DOCX)"] = test_endpoint(
        "POST", "/api/documents/generate",
        "Generate a new document (DOCX)",
        data=generate_data,
        expected_status=200
    )
    
    # Get scheduled reports
    results["GET /api/documents/scheduled"] = test_endpoint(
        "GET", "/api/documents/scheduled",
        "Get scheduled reports"
    )
    
    # Schedule report
    schedule_data = {
        "report_type": "sales_report",
        "frequency": "weekly",
        "emails": ["admin@test.com", "manager@test.com"]
    }
    results["POST /api/documents/schedule"] = test_endpoint(
        "POST", "/api/documents/schedule",
        "Schedule a report",
        data=schedule_data,
        expected_status=200
    )
    
    # ===== SUMMARY =====
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for endpoint, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {endpoint}")
    
    print(f"\n{'='*60}")
    print(f"Total: {passed}/{total} PASSED ({(passed/total)*100:.1f}%)")
    print(f"{'='*60}")
    
    return passed == total

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
