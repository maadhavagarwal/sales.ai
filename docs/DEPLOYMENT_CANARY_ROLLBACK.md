# NeuralBI Deployment Workflow: Canary + Rollback

## Standard Rollout
1. Preflight gates: readiness + quality gates + RBAC coverage.
2. Canary at 10% traffic.
3. Observe for at least 15 minutes:
   - Error rate
   - P95 latency
   - Auth and billing failure spikes
4. Scale to 50% if healthy.
5. Promote to 100%.

## Auto-Rollback Conditions
- Error rate increase > 2%
- P95 latency increase > 30%
- Authentication failure spike

## Rollback Objective
- Target: previous stable release
- Max rollback execution time: 10 minutes

## Post-Rollback Actions
1. Freeze rollout.
2. Open incident runbook.
3. Capture audit evidence and root-cause summary.
4. Re-validate preflight gates before next rollout.
