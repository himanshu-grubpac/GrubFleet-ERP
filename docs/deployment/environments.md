# Environments and promotion

GrubPac ERP uses **branch-aligned environments**. **Git branches** still promote via pull requests (`develop` → `staging` → `pre-prod` → `main`); do not direct-push product code to environment branches.

**API runtime** for staging and above is deployed by **GitHub Actions** only when an **environment branch** is updated (after a promotion PR merge): `staging`, `pre-prod`, or `main`. Jobs run RDS migrate (staging/pre-prod only), SAM Lambda API, and portal S3/CloudFront (see [README](./README.md)). **`develop` pushes do not deploy to AWS** — CI only. Manual SAM ([sam-manual-deploy.md](./sam-manual-deploy.md)) is for emergencies or production migrate only.

Daily integration on **`develop`** may be direct-push or feature PRs per team preference. See [Git workflow (PR-only)](./git-workflow.md).

## Branch flow

| Git branch   | GitHub Environment | `APP_ENV` (backend) | Purpose |
|-------------|--------------------|---------------------|---------|
| `develop`   | — (local / CI)     | `development`       | Integrate features; run locally with Docker Compose |
| `staging`   | `staging`          | `staging`           | Shared staging |
| `pre-prod`  | `pre-production`   | `preprod`           | Production-like validation |
| `main`      | `production`       | `production`        | Live production |

Promotion path (do not skip; **PR only**, no direct pushes):

`feature|fix|chore` → PR → `develop` → PR → `staging` → PR → `pre-prod` → PR → `main`

Each merge to `staging`, `pre-prod`, or `main` triggers the matching deploy workflow after CI is green on the promotion PR (SAM API + portal via GHA).

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
| `AWS_ROLE_ARN` | Portal + SAM API | OIDC role (`GrubFleetGitHubActionsDeploy`) — portal policy + `scripts/iam-grubfleet-gha-sam-deploy-policy.json` |

Repository-level: `GITHUB_TOKEN` is used for GHCR push (packages write permission in workflows).

### Variables (non-secret)

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-staging.example.com/api/v1` | Frontend build-time API URL |
| `PORTAL_S3_BUCKET` | `grubfleet-portal-staging-662252246711` | Static export sync target (from portal stack output) |
| `CLOUDFRONT_DISTRIBUTION_ID` | e.g. `E2P1321QJMJTG0` | Invalidation target after S3 sync |
| `AWS_REGION` | `ap-south-1` | Optional; default in workflow |
| `ACTIVE_SLOT` | `blue` or `green` | Blue-green traffic marker (updated after each deploy) |
| `CORS_ORIGIN` | `https://staging.example.com` | SAM `ClientOrigin` fallback when `SAM_CLIENT_ORIGIN` unset — match CloudFront `PortalUrl` |
| `SAM_CLIENT_ORIGIN` | `https://dxxx.cloudfront.net,http://localhost:3000` | Unquoted comma list for SAM `ClientOrigin` (staging/pre-prod); production portal HTTPS only |
| `VPC_SUBNET_IDS` | `subnet-aaa,subnet-bbb` | Optional; Lambda VPC (staging SAM) — comma-separated, no spaces |
| `VPC_SECURITY_GROUP_IDS` | `sg-xxx` | Optional; pair with `VPC_SUBNET_IDS` |

## CI vs deploy

- **CI** (`.github/workflows/ci.yml`): runs on pull requests **into** `develop`, `staging`, `pre-prod`, or `main`, and on pushes to those branches (usually after a PR merge).
- **Deploy**: merge promotion PR to `staging` / `pre-prod` / `main` only (push to that branch after merge triggers deploy). **`develop` is CI only.** See [git-workflow.md](./git-workflow.md), [blue-green.md](./blue-green.md), and [README.md](./README.md).
