# Observability baseline (GrubFleet ERP)

Production-minded monitoring for the modular monolith API and static portal. Metrics export (Prometheus/OTel) is future work; this doc covers what exists today.

## Health endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health` | Liveness — process up |
| `GET /api/v1/health/ready` | Readiness — PostgreSQL pool, Drizzle, Redis ping when `REDIS_URL` is configured |

Use readiness for load balancer / Lambda target checks. Failures return `503` with `code: NOT_READY` and per-check status in `details`.

Tier URLs: see `docs/deployment/environments.md`.

## Logs

- Structured JSON logging from Nest (level from `LOG_LEVEL`).
- Request **correlation ID** on responses and logs (see `GlobalHttpExceptionFilter` / middleware).
- **Never log:** passwords, JWT access/refresh tokens, full PII dumps from forms.

## What to alert on (staging/production)

- **5xx rate** on `/api/v1/*` above SLO (team-defined).
- **Readiness failures** (database or Redis down).
- **p95 latency** on hot list routes: `organisation/locations`, `organisation/employees`, `/auth/me`.
- **DB connection pool** exhaustion (RDS connections, Lambda concurrency).
- **Redis unavailable** — authz falls back to DB; expect higher latency on permission checks.

## Permission cache

Role permission or assignment changes bump org **permission revision** and invalidate Redis per-user keys. After admin role edits, verify assignees see updated `/auth/me` without re-login.

## New modules

Per `.cursor/rules/26-erp-module-e2e-production-foundation.mdc`: paginate all list endpoints; do not add unbounded catalog work on list hot paths without review.

## Portal (frontend)

- CloudFront 4xx/5xx and origin latency for static export.
- No server-side APM on portal; use Real User Monitoring only if product adds it later.
