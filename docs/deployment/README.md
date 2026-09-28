# Deployment

GrubPac ERP deploys from Git branches via GitHub Actions. Local machines use Docker Compose for data services only.

**Product code uses pull requests only** — no direct pushes to `staging`, `pre-prod`, or `main`. See [Git workflow (PR-only)](./git-workflow.md).

## Documents

- [Git workflow (PR-only)](./git-workflow.md) — feature branches, daily `develop` integration, promotion PRs
- [Environments and promotion](./environments.md) — branches, URLs, secrets, CORS, `APP_ENV`
- [Blue-green deploy](./blue-green.md) — GHCR images, slots, smoke tests, production approval
- [Manual SAM deploy (Lambda)](./sam-manual-deploy.md) — local/emergency `sam deploy` and manual production migrate (routine API deploy is GHA)
- [AWS resource inventory](./aws-resources.md) — CloudFormation stacks, VPC/RDS/Redis/API URLs (no secrets)

## Quick reference

```text
feature/fix/chore  →  PR  →  develop     →  CI only (no AWS deploy)
develop            →  PR  →  staging     →  merge push triggers deploy-staging.yml
staging            →  PR  →  pre-prod    →  merge push triggers deploy-preprod.yml
pre-prod           →  PR  →  main        →  merge push triggers deploy-production.yml (approval on production)
```

Each deploy workflow runs **Drizzle migrate** (staging + pre-prod only), **SAM Lambda API** (`sam-api-deploy`), and **portal S3 + CloudFront** when Environment secrets/vars are set. Production **never** runs migrate in GHA — manual migrate only. See [Environments](./environments.md) for required GitHub secrets.

Container build contexts:

- `apps/backend/Dockerfile` — NestJS API (multi-stage)
- `apps/frontend/Dockerfile` — Next.js standalone (optional; used in CI/GHCR)

Root `docker-compose.yml` is **local dev only** (PostgreSQL + Redis).

After changing HTTP routes, update `docs/api/openapi.yaml` and Postman in the same change set (see `docs/api/README.md`).
