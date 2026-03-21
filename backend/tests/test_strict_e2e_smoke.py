import sqlite3
import uuid
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database_manager import DB_PATH
from app.main import app


@pytest.fixture(autouse=True)
def strict_profile(monkeypatch):
    monkeypatch.setenv("NEURALBI_STRICT_PRODUCTION", "true")
    monkeypatch.setenv("ENABLE_LIVE_KPI_SIMULATOR", "false")


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_context(client):
    email = f"strict-e2e-{uuid.uuid4().hex[:8]}@example.com"
    password = "StrictPass123!"
    payload = {
        "email": email,
        "password": password,
        "companyDetails": {
            "name": f"Strict Co {uuid.uuid4().hex[:6]}",
            "contact_person": "Strict Tester",
            "industry": "Technology",
        },
    }

    response = client.post("/register-enterprise", json=payload)
    assert response.status_code == 200, response.text
    body = response.json()

    token = body["token"]
    company_id = body["company_id"]
    headers = {"Authorization": f"Bearer {token}"}
    return {
        "token": token,
        "email": email,
        "company_id": company_id,
        "headers": headers,
    }


def _insert_invoice(company_id: str, invoice_id: str, amount: float) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO invoices (
                id, company_id, invoice_number, customer_id, date, due_date,
                subtotal, total_tax, cgst_total, sgst_total, igst_total,
                grand_total, status
            ) VALUES (?, ?, ?, ?, date('now'), date('now', '+7 days'), ?, 0, 0, 0, 0, ?, 'PENDING')
            """,
            (
                invoice_id,
                company_id,
                f"INV-{invoice_id[-6:]}",
                "cust-smoke",
                amount,
                amount,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def test_strict_authenticated_e2e_smoke(
    client,
    auth_context,
    monkeypatch,
):
    monkeypatch.setattr(
        "app.services.integration_service.IntegrationService.create_meeting_link",
        lambda title, start_iso, attendees=None: "https://meet.example.com/smoke-room",
    )
    monkeypatch.setattr(
        "app.services.integration_service.IntegrationService.create_payment_link",
        lambda amount, invoice_id, customer_email=None: f"https://pay.example.com/{invoice_id}",
    )
    monkeypatch.setattr(
        "app.services.integration_service.IntegrationService.sync_tally_company",
        lambda company_id, company_name=None: {
            "status": "success",
            "records_synced": 12,
            "raw_response": {"source": "stub"},
        },
    )

    headers = auth_context["headers"]

    meeting_payload = {
        "title": "Strict Smoke Meeting",
        "description": "Validate strict-mode meeting pipeline",
        "date": "2026-03-20",
        "time": "10:00",
        "attendees": [auth_context["email"], "ops@example.com"],
        "location": "Virtual",
        "type": "video",
    }
    meeting_resp = client.post("/api/meetings/", json=meeting_payload, headers=headers)
    assert meeting_resp.status_code == 200, meeting_resp.text
    meeting = meeting_resp.json()
    assert meeting["id"]
    assert meeting["meeting_link"].startswith("https://meet.example.com")

    list_meetings = client.get("/api/meetings/", headers=headers)
    assert list_meetings.status_code == 200
    assert any(m["id"] == meeting["id"] for m in list_meetings.json())

    with client.websocket_connect(f"/api/messaging/ws?token={auth_context['token']}") as ws:
        convo_resp = client.post(
            "/api/messaging/conversations",
            json=["ops@example.com", "finance@example.com"],
            headers=headers,
        )
        assert convo_resp.status_code == 200, convo_resp.text
        conversation = convo_resp.json()
        conversation_id = conversation["id"]

        msg_resp = client.post(
            f"/api/messaging/conversations/{conversation_id}/messages",
            json={
                "conversation_id": conversation_id,
                "content": "Strict smoke message",
                "attachments": [],
            },
            headers=headers,
        )
        assert msg_resp.status_code == 200, msg_resp.text
        event = ws.receive_json()
        assert event["event"] == "message:new"
        assert event["conversation_id"] == conversation_id
        assert event["message"]["content"] == "Strict smoke message"

    invoice_id = f"SMOKE-{uuid.uuid4().hex[:8].upper()}"
    _insert_invoice(auth_context["company_id"], invoice_id, 1999.0)

    payment_resp = client.post(
        f"/workspace/invoices/{invoice_id}/payment-link",
        json={"amount": 1999.0},
        headers=headers,
    )
    assert payment_resp.status_code == 200, payment_resp.text
    assert payment_resp.json()["payment_link"].startswith("https://pay.example.com")

    sync_trigger = client.post("/workspace/sync", headers=headers)
    assert sync_trigger.status_code == 200, sync_trigger.text

    sync_status = client.get("/workspace/sync", headers=headers)
    assert sync_status.status_code == 200
    sync_json = sync_status.json()
    assert sync_json["company_id"] == auth_context["company_id"]
    assert sync_json["status"] in {"idle", "syncing"}
    assert any(log.get("status") == "SUCCESS" for log in sync_json.get("logs", []))
