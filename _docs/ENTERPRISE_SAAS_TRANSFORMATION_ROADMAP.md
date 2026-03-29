# Enterprise SaaS Transformation Roadmap

## Objective
Convert NeuralBI into a production-grade enterprise SaaS platform with strong tenant isolation, compliance controls, secure identity, and scalable operations.

## Current Baseline Delivered
- Unified authentication principal shape for both v1 SQLAlchemy and legacy SQLite paths.
- Tenant-aware dependency separation (`get_current_user_entity`) for onboarding and org-scoped operations.
- Organization membership role enforcement helper (`require_org_roles`).
- Request tracing middleware with `X-Request-ID` and response timing.
- Standardized API exception envelope with request correlation ID.
- Startup production guardrail for strict mode + secure secret requirement.
- SaaS readiness API endpoint for operational hardening visibility.
- Frontend Enterprise Control page with readiness score and controls visualization.

## Target Architecture (Enterprise)
1. Identity and Access
- SSO: OIDC/SAML for enterprise identity providers.
- RBAC and ABAC with policy engine integration.
- Access token + refresh token rotation, revocation list.

2. Multi-Tenancy
- Mandatory tenant scope on all mutable endpoints.
- DB-level tenant partitioning and row-level isolation.
- Tenant-aware quotas and feature flags by subscription plan.

3. Data Platform and Models
- Migrate legacy sqlite data paths into SQLAlchemy/PostgreSQL models.
- Strong domain schemas for invoices, inventory, ledgers, CRM, HR.
- Eventing for audit, analytics, and async processing.

4. Security and Compliance
- Secrets management (Key Vault), no plaintext secrets.
- PII encryption at rest and in transit.
- Immutable enterprise audit trails with retention policies.
- SOC2/GDPR evidence hooks.

5. Reliability and Operations
- Observability: traces, metrics, structured logs, SLO dashboards.
- Queue-backed background jobs and retry policies.
- Blue/green deployments and rollback automation.

6. Frontend Productization
- Enterprise control center for tenant admins.
- Permission-driven UI and feature capability matrices.
- Error boundaries and observability hooks.

## Execution Plan
Phase 1: Security and Tenant Guardrails (in progress)
- Finish route-level org role guards on all business-critical endpoints.
- Remove weak role inference from login flows.

Phase 2: Data and Domain Consolidation
- Move workspace operations fully to SQLAlchemy models.
- Introduce migrations for canonical SaaS schema.

Phase 3: Enterprise IAM
- Add OIDC/SAML and token lifecycle controls.
- Add org-level user management and invitation workflows.

Phase 4: Observability and SRE
- Add OpenTelemetry tracing and centralized logs.
- Add health/readiness/liveness with dependency status.

Phase 5: Billing and Plan Governance
- Plan entitlements, usage metering, and billing events.

Phase 6: Production Readiness Gates
- Security tests, load tests, DR drills, chaos validations.

## Definition of Done (Enterprise)
- 100% tenant-scoped mutable APIs.
- 0 default secrets in production.
- Full request traceability from UI to DB operations.
- Policy-backed RBAC checks across all modules.
- Automated pre-deploy readiness checks with SLO targets.
