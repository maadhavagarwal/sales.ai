
import os
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime

# Add project root to path
sys.path.append(os.getcwd())

from backend.app.engines.workspace_engine import WorkspaceEngine
from backend.app.engines.ml_engine import run_ml_pipeline
from backend.app.engines.rag_engine import build_dataset_index, search_dataset
from backend.app.services.integration_service import IntegrationService
from backend.app.core.database_manager import log_activity, _encrypt_val, _decrypt_val

def test_suite():
    print("=== NeuralBI Enterprise Feature Test Suite ===")

    # 1. Test Encryption at Rest
    sensitive_data = "27AAAAA0000A1Z5"
    encrypted = _encrypt_val(sensitive_data)
    decrypted = _decrypt_val(encrypted)
    print(f"[SECURITY] Encryption Test: {sensitive_data} -> {encrypted} -> {decrypted}")
    assert decrypted == sensitive_data, "Encryption Mismatch!"

    # 2. Test Cash Flow Gap Predictor
    print("[FINANCE] Testing Cash Flow Gap Predictor...")
    gap_data = WorkspaceEngine.predict_cash_flow_gap()
    print(f"Result: {json.dumps(gap_data, indent=2)}")

    # 3. Test Churn Health Scoring
    print("[CRM] Testing Customer Health Scoring...")
    health_scores = WorkspaceEngine.get_customer_health_scores()
    if health_scores and len(health_scores) > 0:
        first = health_scores[0]
        print(f"Sample Score: {first.get('name', 'N/A')} - Health: {first.get('health_score')} (Risk: {first.get('churn_risk')})")
        print(f"Action Triggered: {first.get('next_action')}")
    else:
        print("No customers found for health scoring.")

    # 4. Test Hybrid RAG Engine
    print("[AI] Testing Hybrid RAG (Vector + Keyword)...")
    mock_df = pd.DataFrame({
        'name': ['Laptop Pro', 'Mouse Wireless', 'Keyboard RGB'],
        'category': ['Electronics', 'Peripherals', 'Peripherals'],
        'price': [120000, 1500, 4500],
        'date': ['2026-01-01', '2026-01-02', '2026-01-03']
    })
    build_dataset_index(mock_df)
    results = search_dataset("Laptop electronics price")
    print(f"RAG Results: {results}")

    # 5. Test Anomaly Detection (Isolation Forest)
    print("[AI] Testing Proactive Anomaly Detection...")
    anamoly_df = pd.DataFrame({
        'revenue': [100, 110, 105, 95, 120, 1000000], # Clear outlier
        'month': [1, 1, 1, 1, 1, 1],
        'year': [2026, 2026, 2026, 2026, 2026, 2026],
        'date': ['2026-01-01']*6
    })
    ml_res = run_ml_pipeline(anamoly_df)
    print(f"Anomalies Found: {ml_res.get('anomalies')}")
    print(f"Scenarios Generated: {ml_res.get('scenarios')}")

    # 6. Test GST JSON Export
    print("[COMPLIANCE] Testing GSTR-1 JSON Schema...")
    mock_inv = [{
        'customer_gstin': '27ABCDE1234F1Z1',
        'invoice_number': 'INV-999',
        'grand_total': 50000,
        'subtotal': 45000,
        'cgst_total': 2500,
        'sgst_total': 2500,
        'date': '2026-03-14',
        'hsn_code': '8414'
    }]
    gstr_json = IntegrationService.generate_gstr1_json(mock_inv)
    print(f"GSTR-1 JSON (Sample): {json.dumps(gstr_json['b2b'][0]['inv'][0]['itms'][0]['itm_det'], indent=2)}")

    # 7. Test E-Invoicing IRN (NIC Schema)
    print("[COMPLIANCE] Testing NIC IRN Generation...")
    irp_res = IntegrationService.generate_einvoice_irn(mock_inv[0])
    print(f"IRN: {irp_res['irn']}")
    print(f"QR Code: {irp_res['qr_code_data']}")

    print("\n=== ALL ENTERPRISE TESTS COMPLETED ===")

if __name__ == "__main__":
    test_suite()
