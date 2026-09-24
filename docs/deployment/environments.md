# Environments and promotion

GrubPac ERP uses **branch-aligned environments**. Application code reaches staging and above **only** through **pull request merges** and GitHub Actions — not direct branch pushes or manual server sync.

Daily integration happens on **`develop`** via `feature/`, `fix/`, or `chore/` branches. See [Git workflow (PR-only)](./git-workflow.md).

## Branch flow

| Git branch   | GitHub Environment | `APP_ENV` (backend) | Purpose |
|-------------|--------------------|---------------------|---------|
| `develop`   | — (local / CI)     | `development`       | Integrate features; run locally with Docker Compose |
| `staging`   | `staging`          | `staging`           | Shared staging |
| `pre-prod`  | `pre-production`   | `preprod`           | Production-like validation |
| `main`      | `production`       | `production`        | Live production |

Promotion path (do not skip; **PR only**, no direct pushes):

`feature|fix|chore` → PR → `develop` → PR → `staging` → PR → `pre-prod` → PR → `main`

Each merge to `staging`, `pre-prod`, or `main` triggers the matching deploy workflow after CI is green on the promotion PR.

## URLs (placeholders)

Replace `example.com` with your real domains in GitHub **Environment variables** and OpenAPI `servers`.

| Tier        | API base (placeholder)              | Web app (placeholder)           |
|------------|--------------------------------------|---------------------------------|
| Local dev  | `http://localhost:4000/api/v1`       | `http://localhost:3000`         |
| Staging    | `https://api-staging.example.com/api/v1` | `https://staging.example.com` |
| Pre-prod   | `https://api-preprod.example.com/api/v1` | `https://preprod.example.com` |
| Production | `https://api.example.com/api/v1`     | `https://app.example.com`       |

## Local development

- **Docker Compose** (`docker-compose.yml`): PostgreSQL and Redis only — not full app containers.
- Copy root [`.env.example`](../../.env.example) to `apps/backend/.env.development` and set `apps/frontend/.env.local` for `NEXT_PUBLIC_*`.
- Defaults: `APP_ENV=development`, `NODE_ENV=development`.

## Backend configuration

- **`APP_ENV`**: deployment tier (`development` | `staging` | `preprod` | `production`). Validated at startup in `apps/backend/src/config/env.schema.ts`.
- **`NODE_ENV`**: Node/Nest runtime mode (`development` | `test` | `production`). Deployed containers typically use `NODE_ENV=production` with `APP_ENV` set to the tier.
- **Production**: when `APP_ENV=production`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (each ≥ 32 characters) are **required** or the process exits on boot.

## CORS per environment

Set `CORS_ORIGIN` in each GitHub Environment to the **exact** web origin (scheme + host + port if non-default):

- Staging: `https://staging.example.com`
- Pre-prod: `https://preprod.example.com`
- Production: `https://app.example.com`

Local: `http://localhost:3000` (default in `.env.example`).

## GitHub Environments — secrets and variables

Configure under **Settings → Environments** for `staging`, `pre-production`, and `production`.

### Secrets (never commit values)

| Secret | Used by | Description |
|--------|---------|-------------|
| `DATABASE_URL` | Runtime / deploy | PostgreSQL connection string for that tier |
| `REDIS_URL` | Runtime / deploy | Redis connection string |
| `JWT_ACCESS_SECRET` | Backend | Required when `APP_ENV=production` |
| `JWT_REFRESH_SECRET` | Backend | Required when `APP_ENV=production` |
| `DEPLOY_HEALTH_URL` | Deploy workflow | API base for smoke test, e.g. `https://api-staging.example.com/api/v1` |
| `DEPLOY_TARGET` | Deploy workflow | Placeholder for ECS service, CodeDeploy app, or host target |
| `AWS_ROLE_ARN` | Future | OIDC role for AWS deploy (optional until wired) |

Repository-level: `GITHUB_TOKEN` is used for GHCR push (packages write permission in workflows).

### Variables (non-secret)

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-staging.example.com/api/v1` | Frontend build-time API URL |
| `ACTIVE_SLOT` | `blue` or `green` | Blue-green traffic marker (updated after each deploy) |
| `CORS_ORIGIN` | `https://staging.example.com` | Injected into backend runtime env at deploy |

## CI vs deploy

- **CI** (`.github/workflows/ci.yml`): runs on pull requests **into** `develop`, `staging`, `pre-prod`, or `main`, and on pushes to those branches (usually after a PR merge).
- **Deploy**: merge to `staging` / `pre-prod` / `main` via PR only; the merge commit triggers deploy — see [git-workflow.md](./git-workflow.md), [blue-green.md](./blue-green.md), and [README.md](./README.md).
