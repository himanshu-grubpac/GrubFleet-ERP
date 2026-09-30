# Manual SAM deploy (Lambda + HTTP API)

GrubFleet ERP runs the NestJS API on **AWS Lambda** behind an **HTTP API**. **Routine deploys** use GitHub Actions (`sam-api-deploy` in `reusable-container-deploy.yml`) when promotion PRs merge to `staging`, `pre-prod`, or `main` — see [README](./README.md). This page covers **local / emergency** `sam deploy` (profile `grubfleet-erp`, region `ap-south-1`) and **manual production migrations** only.

Live stack names, URLs, and VPC/data endpoints: [AWS resource inventory](./aws-resources.md).

RDS, ElastiCache, and secrets are **not** created by `template.yaml` in this scaffold — pass `DatabaseUrl` and `RedisUrl` as SAM parameters after you provision them.

## Prerequisites

- Node.js 20+, npm workspaces installed at repo root (`npm ci`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS CLI profile **`grubfleet-erp`** with permission to deploy CloudFormation, Lambda, HTTP API, EventBridge
- PostgreSQL and Redis reachable from Lambda (VPC/security groups configured outside this doc)

## One-time config

1. Copy the example config for your tier (do **not** commit the real file):

   ```powershell
   copy samconfig.staging.example.toml samconfig.staging.toml
   ```

   Use `samconfig.preprod.example.toml` → `samconfig.preprod.toml` or `samconfig.production.example.toml` → `samconfig.production.toml` as needed.

2. Edit the gitignored `samconfig.*.toml` and replace every `REPLACE_ME` in `parameter_overrides` (database URL, Redis URL, JWT secrets, frontend `ClientOrigin` for CORS).

3. Stack names follow the examples: `grubfleet-api-staging`, `grubfleet-api-preprod`, `grubfleet-api-production`.

## Build and deploy

From the repository root:

```powershell
npm run prepare:lambda
node scripts/stage-sam-artifacts.mjs
node scripts/sam-deploy.mjs staging
```

Or use the combined script (recommended on Windows — avoids SAM config path issues when the repo path contains spaces):

```powershell
npm run deploy:staging:api
```

Preprod and production:

```powershell
npm run deploy:preprod:api
npm run deploy:production:api
```

`prepare:lambda` builds `@grubpac/validation` and the backend, copies `apps/backend/dist` into `lambda-package/`, runs an isolated `npm install --omit=dev --ignore-scripts` for production dependencies (materializing workspace `file:` packages under `node_modules`), and verifies the bundle (`npm run verify:lambda-package`). CI runs the same prepare step on every backend job.

## After deploy

1. Note stack output **`HttpApiUrl`** (e.g. `https://abc123.execute-api.ap-south-1.amazonaws.com`).

2. **Frontend API base** (Khushi / Next.js): set  
   `NEXT_PUBLIC_API_BASE_URL={HttpApiUrl}/api/v1`  
   (Nest global prefix is `api/v1`; health check is `GET {HttpApiUrl}/api/v1/health`.)

   **Hosted portal:** after [S3 + CloudFront deploy](./s3-cloudfront-portal.md), set `ClientOrigin` to the stack `PortalUrl` and redeploy SAM (`scripts/update-sam-client-origin.ps1 -Tier <tier>`).

3. **Migrations** — run against RDS from a trusted host (not inside this SAM stack):

   ```powershell
   powershell -File scripts/run-migrate-from-samconfig.ps1 -Tier staging
   ```

   Or set `$env:DATABASE_URL` from gitignored `samconfig.<tier>.toml` and run `npm run db:migrate -w backend`.

4. Optional seed (non-production only, per your process):

   ```powershell
   powershell -File scripts/run-seed-from-samconfig.ps1 -Tier staging
   ```

## Swagger

OpenAPI UI is enabled only when `APP_ENV=development`. Lambda tiers use `staging` / `preprod` / `production`, so Swagger is off in AWS. Use local `npm run start:dev -w backend` or committed `docs/api/openapi.yaml` for contract reference.

## Validate template locally

```powershell
npm run prepare:lambda
sam validate
sam build
```

## Troubleshooting

- **Env validation failed on cold start** — check Lambda environment variables match `apps/backend/src/config/env.schema.ts` (especially JWT secrets when `AppEnv=production`).
- **502 / timeout** — ensure Lambda can reach RDS/Redis (VPC, security groups, connection string).
- **CORS** — `ClientOrigin` in `samconfig.<tier>.toml` must be an **unquoted** comma list (`ClientOrigin=https://dxxx.cloudfront.net,http://localhost:3000`). Quoted values collapse to one invalid origin. Same list drives API Gateway and Lambda `CORS_ORIGIN` (`template.yaml`). Production: portal URL only.
- **Windows / paths with spaces** — `npm run deploy:*:api` uses `scripts/sam-deploy.mjs` so SAM receives an absolute `samconfig.*.toml` path.
- **samconfig encoding** — UTF-8 without BOM; use escaped `\"` inside `parameter_overrides` (see existing gitignored files).

Integration branch note: **direct-push `develop`** for day-to-day work; AWS deploy runs only after promotion PR merges to `staging`, `pre-prod`, or `main`.
