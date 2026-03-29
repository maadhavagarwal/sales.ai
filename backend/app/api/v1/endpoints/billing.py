from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import json
import sqlite3
from datetime import datetime, timedelta, timezone

try:
    import razorpay
except Exception:
    razorpay = None

from app.core.database import get_db
from app.core.database_manager import DB_PATH
from app.models.tenant import Organization
from app.services.billing_service import BillingService

router = APIRouter()

WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")
PLAN_ID_PRO = (os.getenv("RAZORPAY_PLAN_ID_PRO") or "").strip()
PLAN_ID_ENTERPRISE = (os.getenv("RAZORPAY_PLAN_ID_ENTERPRISE") or "").strip()

RAZORPAY_TO_INTERNAL_STATUS = {
    "active": "ACTIVE",
    "authenticated": "ACTIVE",
    "created": "INACTIVE",
    "pending": "PAST_DUE",
    "halted": "PAST_DUE",
    "paused": "PAST_DUE",
    "cancelled": "CANCELED",
    "cancelled_by_user": "CANCELED",
    "completed": "CANCELED",
}


def _utc_now_iso() -> str:
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()


def _ensure_billing_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL,
            actor_email TEXT,
            event_type TEXT NOT NULL,
            status TEXT NOT NULL,
            details_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id TEXT NOT NULL UNIQUE,
            provider TEXT NOT NULL DEFAULT 'RAZORPAY',
            provider_customer_id TEXT,
            provider_subscription_id TEXT,
            plan_code TEXT NOT NULL DEFAULT 'FREE',
            lifecycle_status TEXT NOT NULL DEFAULT 'INACTIVE',
            status_reason TEXT,
            grace_ends_at TEXT,
            current_period_end TEXT,
            canceled_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _append_billing_event(company_id: str, event_type: str, status: str, details: dict) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_billing_tables(conn)
        conn.execute(
            """
            INSERT INTO billing_events (company_id, actor_email, event_type, status, details_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (company_id, "system@webhook", event_type, status, json.dumps(details)),
        )
        conn.commit()
    finally:
        conn.close()


def _upsert_subscription_snapshot(
    company_id: str,
    provider_customer_id: str | None,
    provider_subscription_id: str | None,
    plan_code: str,
    lifecycle_status: str,
    status_reason: str | None = None,
    grace_ends_at: str | None = None,
    current_period_end: str | None = None,
    canceled_at: str | None = None,
) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        _ensure_billing_tables(conn)
        conn.execute(
            """
            INSERT INTO billing_subscriptions (
                company_id, provider_customer_id, provider_subscription_id, plan_code,
                lifecycle_status, status_reason, grace_ends_at, current_period_end, canceled_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(company_id) DO UPDATE SET
                provider_customer_id = excluded.provider_customer_id,
                provider_subscription_id = excluded.provider_subscription_id,
                plan_code = excluded.plan_code,
                lifecycle_status = excluded.lifecycle_status,
                status_reason = excluded.status_reason,
                grace_ends_at = excluded.grace_ends_at,
                current_period_end = excluded.current_period_end,
                canceled_at = excluded.canceled_at,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                company_id,
                provider_customer_id,
                provider_subscription_id,
                plan_code,
                lifecycle_status,
                status_reason,
                grace_ends_at,
                current_period_end,
                canceled_at,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _resolve_plan_code(plan_candidate: str | None, fallback: str | None = None) -> str:
    raw = str(plan_candidate or fallback or "").upper()
    if raw in {"FREE", "PRO", "ENTERPRISE"}:
        return raw
    if plan_candidate and str(plan_candidate) == PLAN_ID_ENTERPRISE:
        return "ENTERPRISE"
    if plan_candidate and str(plan_candidate) == PLAN_ID_PRO:
        return "PRO"
    if "ENTERPRISE" in raw:
        return "ENTERPRISE"
    if "PRO" in raw:
        return "PRO"
    return "FREE"


def _resolve_lifecycle_status(razorpay_status: str | None) -> str:
    raw = str(razorpay_status or "").strip().lower()
    if not raw:
        return "INACTIVE"
    return RAZORPAY_TO_INTERNAL_STATUS.get(raw, raw.upper())


def _event_payload(event: dict, *path: str) -> dict:
    cursor = event
    for key in path:
        if not isinstance(cursor, dict):
            return {}
        cursor = cursor.get(key, {})
    return cursor if isinstance(cursor, dict) else {}


@router.post("/webhook", include_in_schema=False)
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay webhook receiver to reconcile subscription and billing events.

    Expects `RAZORPAY_WEBHOOK_SECRET` to be set in the environment for signature verification.
    """
    payload = await request.body()
    sig_header = request.headers.get("X-Razorpay-Signature")
    if not sig_header or not WEBHOOK_SECRET or not razorpay:
        raise HTTPException(status_code=400, detail="Missing signature, webhook secret, or Razorpay SDK")

    try:
        # Verify signature
        razorpay.Utility.verify_webhook_signature(payload, sig_header, WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event = json.loads(payload)
        etype = str(event.get("event") or "").strip()
        payment = _event_payload(event, "payload", "payment", "entity")
        payment_link = _event_payload(event, "payload", "payment_link", "entity")
        subscription = _event_payload(event, "payload", "subscription", "entity")

        customer_id = (
            payment.get("customer_id")
            or subscription.get("customer_id")
            or subscription.get("customer")
            or (payment_link.get("customer") or {}).get("id")
        )
        org = None
        if customer_id:
            org = db.query(Organization).filter(Organization.stripe_customer_id == customer_id).first()

        if not org:
            _append_billing_event(
                company_id="UNKNOWN",
                event_type=etype or "UNKNOWN_EVENT",
                status="FAILED",
                details={
                    "reason": "organization_not_found",
                    "provider_customer_id": customer_id,
                },
            )
            return {"received": True}

        org_company_id = str(org.uuid)
        current_plan = str(org.subscription_plan or "FREE").upper()

        if etype in {"payment.link.paid", "payment_link.paid", "payment.captured"}:
            paid_plan = _resolve_plan_code(
                payment_link.get("notes", {}).get("plan")
                or payment.get("notes", {}).get("plan")
                or payment.get("description"),
                fallback=current_plan if current_plan != "FREE" else "PRO",
            )
            org.subscription_plan = paid_plan
            org.subscription_status = "ACTIVE"
            db.add(org)
            db.commit()

            _upsert_subscription_snapshot(
                company_id=org_company_id,
                provider_customer_id=customer_id,
                provider_subscription_id=str(subscription.get("id") or ""),
                plan_code=paid_plan,
                lifecycle_status="ACTIVE",
                status_reason=etype,
                current_period_end=None,
            )
            _append_billing_event(
                company_id=org_company_id,
                event_type="PAYMENT_SUCCESS",
                status="SUCCESS",
                details={"provider_event": etype, "plan": paid_plan},
            )

        elif etype in {"payment.failed"}:
            org.subscription_status = "PAST_DUE"
            db.add(org)
            db.commit()

            grace_ends_at = (datetime.utcnow() + timedelta(days=7)).replace(tzinfo=timezone.utc).isoformat()
            _upsert_subscription_snapshot(
                company_id=org_company_id,
                provider_customer_id=customer_id,
                provider_subscription_id=str(subscription.get("id") or ""),
                plan_code=current_plan,
                lifecycle_status="GRACE",
                status_reason=etype,
                grace_ends_at=grace_ends_at,
            )
            _append_billing_event(
                company_id=org_company_id,
                event_type="PAYMENT_FAILED",
                status="FAILED",
                details={"provider_event": etype, "grace_ends_at": grace_ends_at},
            )

        elif etype.startswith("subscription."):
            razorpay_status = subscription.get("status")
            lifecycle_status = _resolve_lifecycle_status(razorpay_status)
            mapped_plan = _resolve_plan_code(subscription.get("plan_id"), fallback=current_plan)

            if etype == "subscription.pending":
                lifecycle_status = "TRIAL"
            if etype in {"subscription.halted", "subscription.paused"}:
                lifecycle_status = "PAST_DUE"
            if etype in {"subscription.cancelled", "subscription.completed"}:
                lifecycle_status = "CANCELED"

            grace_ends_at = None
            if lifecycle_status in {"PAST_DUE", "GRACE"}:
                lifecycle_status = "GRACE"
                grace_ends_at = (datetime.utcnow() + timedelta(days=7)).replace(tzinfo=timezone.utc).isoformat()

            current_period_end = None
            if subscription.get("current_end"):
                try:
                    current_period_end = datetime.fromtimestamp(
                        int(subscription.get("current_end")), tz=timezone.utc
                    ).isoformat()
                except Exception:
                    current_period_end = None

            canceled_at = _utc_now_iso() if lifecycle_status == "CANCELED" else None

            org.subscription_plan = mapped_plan
            org.subscription_status = lifecycle_status if lifecycle_status in {"ACTIVE", "INACTIVE", "PAST_DUE", "CANCELED"} else "ACTIVE"
            db.add(org)
            db.commit()

            _upsert_subscription_snapshot(
                company_id=org_company_id,
                provider_customer_id=customer_id,
                provider_subscription_id=str(subscription.get("id") or ""),
                plan_code=mapped_plan,
                lifecycle_status=lifecycle_status,
                status_reason=etype,
                grace_ends_at=grace_ends_at,
                current_period_end=current_period_end,
                canceled_at=canceled_at,
            )
            _append_billing_event(
                company_id=org_company_id,
                event_type=f"SUBSCRIPTION_{lifecycle_status}",
                status="SUCCESS",
                details={
                    "provider_event": etype,
                    "provider_status": razorpay_status,
                    "plan": mapped_plan,
                    "grace_ends_at": grace_ends_at,
                    "current_period_end": current_period_end,
                },
            )

        elif etype in {"order.paid", "invoice.paid"}:
            _append_billing_event(
                company_id=org_company_id,
                event_type="RENEWAL_SUCCESS",
                status="SUCCESS",
                details={"provider_event": etype},
            )
        else:
            _append_billing_event(
                company_id=org_company_id,
                event_type=etype or "UNKNOWN_EVENT",
                status="SUCCESS",
                details={"note": "event_received_no_state_change"},
            )

    except Exception as e:
        print(f"Razorpay webhook processing error: {e}")

    return {"received": True}
