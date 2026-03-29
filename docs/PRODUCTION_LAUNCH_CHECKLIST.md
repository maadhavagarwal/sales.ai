# NeuralBI Production Launch Checklist

Use this checklist to move from a demo-grade deployment to a production launch.

## 1) Security Gates
- [ ] `NEURALBI_STRICT_PRODUCTION=true`
- [ ] `SECRET_KEY` is non-placeholder and 32+ chars
- [ ] `DATABASE_URL` uses PostgreSQL
- [ ] `ENABLE_LIVE_KPI_SIMULATOR=false`
- [ ] `ALLOWED_ORIGINS` contains only trusted HTTPS domains (no localhost, no wildcard)
- [ ] `.env.example` contains placeholders only (no real secrets)

## 2) Service Health and Readiness
- [ ] `GET /health` returns `200` and status `healthy`
- [ ] `GET /ready` returns `200` with `status=ready` before release
- [ ] In strict mode, `/ready` failure blocks deployment

## 3) Verification Commands
```bash
# Backend checks
cd backend
pytest tests/ -v

# Frontend checks
cd ../frontend
npm run lint
npm run type-check
npm run build
```

## 4) Deployment Safety
- [ ] Database migration plan reviewed (`alembic upgrade head`)
- [ ] Rollback plan documented
- [ ] Backup + restore drill completed
- [ ] Smoke tests pass on deployed URLs

## 5) Post-Launch Monitoring
- [ ] Error-rate alert configured
- [ ] Latency alert configured
- [ ] Uptime checks on `/health` and `/ready`
- [ ] On-call response owner assigned
