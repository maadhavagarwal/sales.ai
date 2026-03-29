import os
from typing import Optional
from sqlalchemy.orm import Session
from app.models.tenant import Organization

try:
    import razorpay
except Exception:
    razorpay = None


RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")


class BillingService:
    @staticmethod
    def _client():
        if not razorpay or not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
            return None
        return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

    @staticmethod
    def create_customer(org: Organization, db: Session) -> Optional[str]:
        """Creates a Razorpay customer for an organization and stores the id on the org record.

        Note: this re-uses the `stripe_customer_id` column as a generic payment customer id to avoid schema changes.
        """
        client = BillingService._client()
        if not client:
            return None

        try:
            payload = {"name": org.name}
            customer = client.customer.create(payload)
            cust_id = customer.get("id")
            if cust_id:
                org.stripe_customer_id = cust_id
                db.add(org)
                db.commit()
                return cust_id
        except Exception as e:
            print(f"Razorpay Customer Creation Error: {e}")
        return None

    @staticmethod
    def get_subscription_details(org: Organization):
        """Fetches subscription/status for the organization using Razorpay APIs.

        Returns a best-effort dict with keys: id, plan, status
        """
        client = BillingService._client()
        if not client or not org.stripe_customer_id:
            return {"plan": org.subscription_plan, "status": org.subscription_status}

        try:
            # Fetch subscriptions for customer
            subs = client.subscription.fetch_all(params={"customer_id": org.stripe_customer_id, "count": 1})
            items = subs.get("items") or []
            if not items:
                return {"plan": "FREE", "status": "INACTIVE"}

            sub = items[0]
            return {
                "id": sub.get("id"),
                "plan": sub.get("plan_id") or org.subscription_plan,
                "status": sub.get("status"),
            }
        except Exception as e:
            print(f"Razorpay Subscription Fetch Error: {e}")
            return {"plan": org.subscription_plan, "status": org.subscription_status}

    @staticmethod
    def create_checkout_session(org: Organization, plan_key: str, success_url: str, cancel_url: str):
        """Creates a Razorpay Payment Link for a recurring plan and returns the short_url.

        Expects env vars: `RAZORPAY_PRICE_PRO` and `RAZORPAY_PRICE_ENTERPRISE` as amounts in paise (int).
        """
        client = BillingService._client()
        if not client:
            raise ValueError("Razorpay is not configured.")

        price_map = {
            "PRO": os.getenv("RAZORPAY_PRICE_PRO"),
            "ENTERPRISE": os.getenv("RAZORPAY_PRICE_ENTERPRISE"),
        }

        amount = price_map.get(plan_key)
        if not amount:
            raise ValueError("Plan price not configured")

        try:
            payload = {
                "type": "link",
                "amount": int(amount),
                "currency": "INR",
                "description": f"Subscription: {plan_key}",
                "callback_url": success_url or "",
                "callback_method": "get",
                "recurring": {"type": "subscription", "interval": "monthly", "interval_count": 1},
                "customer": {"name": org.name},
            }

            link = client.payment_link.create(payload)
            return link
        except Exception as e:
            print(f"Razorpay Payment Link Creation Error: {e}")
            raise
