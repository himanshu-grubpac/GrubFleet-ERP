# Deployment

GrubPac ERP deploys from Git branches via GitHub Actions. Local machines use Docker Compose for data services only.

**Product code uses pull requests only** — no direct pushes to `staging`, `pre-prod`, or `main`. See [Git workflow (PR-only)](./git-workflow.md).

## Documents

- [Git workflow (PR-only)](./git-workflow.md) — feature branches, daily `develop` integration, promotion PRs
- [Environments and promotion](./environments.md) — branches, URLs, secrets, CORS, `APP_ENV`
- [Blue-green deploy](./blue-green.md) — GHCR images, slots, smoke tests, production approval

## Quick reference

```text
feature/fix/chore  →  PR  →  develop     (local APP_ENV=development)
develop            →  PR  →  staging     →  push triggers deploy-staging.yml
staging            →  PR  →  pre-prod    →  push triggers deploy-preprod.yml
pre-prod           →  PR  →  main        →  push triggers deploy-production.yml (approval on production)
```

Container build contexts:

- `apps/backend/Dockerfile` — NestJS API (multi-stage)
- `apps/frontend/Dockerfile` — Next.js standalone (optional; used in CI/GHCR)

Root `docker-compose.yml` is **local dev only** (PostgreSQL + Redis).

After changing HTTP routes, update `docs/api/openapi.yaml` and Postman in the same change set (see `docs/api/README.md`).
