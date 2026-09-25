# Manual SAM deploy (Lambda + HTTP API)

GrubFleet ERP can run the NestJS API on **AWS Lambda** behind an **HTTP API**, similar to the attendance-web stack. This path is **manual** (local `sam deploy` with profile `grubfleet-erp`, region `ap-south-1`). It coexists with the **GitHub Actions container deploy** documented in [Blue-green deploy](./blue-green.md); choose one API hosting model per environment.

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
npm run sam:build
sam deploy --config-file samconfig.staging.toml
```

Or use the combined script:

```powershell
npm run deploy:staging:api
```

Preprod and production:

```powershell
npm run deploy:preprod:api
npm run deploy:production:api
```

`prepare:lambda` runs `nest build`, copies `apps/backend/dist` into `lambda-package/`, runs `npm ci --omit=dev` for production dependencies, then removes manifests so SAM does not rebuild node_modules.

## After deploy

1. Note stack output **`HttpApiUrl`** (e.g. `https://abc123.execute-api.ap-south-1.amazonaws.com`).

2. **Frontend API base** (Khushi / Next.js): set  
   `NEXT_PUBLIC_API_BASE_URL={HttpApiUrl}/api/v1`  
   (Nest global prefix is `api/v1`; health check is `GET {HttpApiUrl}/api/v1/health`.)

3. **Migrations** — run against RDS from a trusted host (not inside this SAM stack):

   ```powershell
   $env:DATABASE_URL = "<same as DatabaseUrl parameter>"
   npm run db:migrate -w backend
   ```

4. Optional seed (non-production only, per your process):

   ```powershell
   npm run db:seed -w backend
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
- **CORS** — `ClientOrigin` must match the browser origin exactly (scheme + host, no trailing path).

Integration branch note: Himanshu may **direct-push `develop`** for day-to-day work; SAM deploy is independent of GHA until you wire a workflow.
