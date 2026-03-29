 # Billing & Razorpay Integration

This document describes how to configure Razorpay for production billing and webhook reconciliation for NeuralBI.

## Required Environment Variables

- `RAZORPAY_KEY_ID` — Razorpay key id (starts with `rzp_live_...`).
- `RAZORPAY_KEY_SECRET` — Razorpay key secret.
- `RAZORPAY_WEBHOOK_SECRET` — Razorpay webhook signing secret.
- `RAZORPAY_PRICE_PRO` — Price for Pro plan (amount in paise, e.g., `49900` for ₹499.00).
- `RAZORPAY_PRICE_ENTERPRISE` — Price for Enterprise plan (amount in paise).

## Webhook Endpoint

The application exposes a webhook endpoint at:

```
POST /api/v1/billing/webhook
```

Set the webhook URL in the Razorpay Dashboard to `https://<your-domain>/api/v1/billing/webhook` and subscribe to events such as:

- `payment.link.paid`
- `subscription.charged` / `subscription.created`
- `subscription.paused`
- `subscription.cancelled`

## Behavior

- On `payment.link.paid` the server marks the Organization subscription as active (e.g., `PRO`).
- On subscription lifecycle events, the server reconciles the subscription and updates the Organization's `subscription_plan` and `subscription_status`.
- The webhook endpoint validates signatures using `RAZORPAY_WEBHOOK_SECRET`.

## Security Notes

- Keep `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in a secure secrets store (Key Vault, AWS Secrets Manager, etc.).
- Use HTTPS for webhook endpoints and validate signatures using the official `razorpay` Python SDK.
- Monitor webhook delivery and set up alerts for repeated failures.

## Local Testing

Use `razorpay` CLI or dashboard webhooks forwarding (or the `razorpay` testing tools) to forward events locally for development. Example local testing using the `razorpay` CLI is similar to listening to webhook events and posting them to `http://localhost:8000/api/v1/billing/webhook`.

For simple manual testing you can create a payment link via the API and complete a test payment to observe the webhook behavior.
