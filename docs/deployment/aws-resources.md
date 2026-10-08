# GrubFleet ERP — AWS resource inventory



**Last updated:** 2026-10-08



## Overview



| Item | Value |

|------|--------|

| AWS account | `662252246711` |

| CLI profile | `grubfleet-erp` |

| Region | `ap-south-1` (Mumbai) |

| Naming prefix | `grubfleet-*` |



This inventory covers **GrubFleet-ERP only**. It does **not** include attendance-web, GrubAdmin pilot EC2, or other vertical stacks.

## Live API & portal URLs (maintain on redeploy)

GrubFleet **frontend** is deployed via **S3 + CloudFront** (stack `grubfleet-portal-{tier}`). See [s3-cloudfront-portal.md](./s3-cloudfront-portal.md). SAM **`ClientOrigin`** (unquoted comma list in `samconfig.<tier>.toml`) is the single source of truth for API Gateway CORS and Lambda `CORS_ORIGIN` (`template.yaml` Metadata). Staging/pre-prod: `ClientOrigin=https://{portal},http://localhost:3000`; production: portal URL only. Run `scripts/update-sam-client-origin.ps1 -Tier <tier>` after portal deploy.

| Tier | Frontend portal (CloudFront) | HTTP API (SAM output) | `NEXT_PUBLIC_API_BASE_URL` | Health smoke |
|------|------------------------------|------------------------|----------------------------|--------------|
| Staging | `https://d3swe5av2h6i8p.cloudfront.net` | `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com` | `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com/api/v1` | `GET .../api/v1/health` |
| Pre-prod | `https://d2fyfrapktmstq.cloudfront.net` | `https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com` | `https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com/api/v1` | `GET .../api/v1/health` |
| Production | `https://d30hrnureiq1oz.cloudfront.net` | `https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com` | `https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com/api/v1` | `GET .../api/v1/health` |

**CORS `ClientOrigin`:** comma-separated list in SAM only — not a separate env var on Lambda outside the stack. Refresh with `scripts/update-sam-client-origin.ps1` after portal URL changes.

| Tier | OpenAPI / Swagger (when API is up) |
|------|-------------------------------------|
| All | `{NEXT_PUBLIC_API_BASE_URL}/docs` (e.g. staging: `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com/api/v1/docs`) |

**Seed admin (all tiers after migrate/seed):** `admin@grubpac.local` — password in local `.project-tracking/SEED_CREDENTIALS.local.md` only (not in git). Bootstrap logic: `apps/backend/src/database/seed/dev-admin-bootstrap.ts` via `run-seed.ts` / `run-seed-from-samconfig.ps1`.

## CloudFormation stacks



| Stack | Purpose | Status (live) |

|-------|---------|---------------|

| `grubfleet-network` | Shared VPC, subnets, security groups | `CREATE_COMPLETE` |

| `grubfleet-data-staging` | ElastiCache Redis (staging); ERP Postgres on shared `grubpac-v2` | `UPDATE_COMPLETE` |

| `grubfleet-data-preprod` | ElastiCache Redis (pre-prod); ERP Postgres on shared `grubpac-v2` | `CREATE_COMPLETE` |

| `grubfleet-data-production` | ElastiCache Redis (production); ERP Postgres on shared `grubpac-v2` | `CREATE_COMPLETE` |

| `grubfleet-api-staging` | SAM — Lambda + HTTP API (staging) | `UPDATE_COMPLETE` |

| `grubfleet-api-preprod` | SAM API (pre-prod) | `CREATE_COMPLETE` |

| `grubfleet-api-production` | SAM API (production) | `UPDATE_COMPLETE` (health + auth smoke OK) |

| `grubfleet-portal-staging` | S3 + CloudFront portal (staging) | `UPDATE_COMPLETE` |

| `grubfleet-portal-preprod` | Portal (pre-prod) | `UPDATE_COMPLETE` |

| `grubfleet-portal-production` | Portal (production) | `UPDATE_COMPLETE` |



Stack ARNs follow: `arn:aws:cloudformation:ap-south-1:662252246711:stack/<stack-name>/...`



## Network (`grubfleet-network`)



| Resource | ID / CIDR | Purpose |

|----------|-----------|---------|

| VPC | `vpc-004c4f6f228ce6050` (`10.42.0.0/16`) | GrubFleet ERP isolated network |

| Public subnet A | `subnet-0d9ac34fbee2e4160` (`10.42.0.0/24`) | Public RDS (staging/preprod bootstrap), IGW routes |

| Public subnet B | `subnet-0413bf14e6f391886` (`10.42.1.0/24`) | Public RDS AZ B |

| Private subnet A | `subnet-0d88d823842ae5a46` (`10.42.10.0/24`) | Lambda, private RDS/Redis |

| Private subnet B | `subnet-051d6188f4e829db7` (`10.42.11.0/24`) | Lambda, private RDS/Redis AZ B |

| Lambda SG | `sg-0732094de05e8f03b` | Egress for API Lambda |

| RDS SG (legacy `grubfleet-data-*` RDS) | `sg-0198b9781297f8bf7` | Was used for per-tier ERP RDS (decommissioned 2026-10-01) |

| VPC peering | `pcx-0ce6f67302db55f59` | GrubFleet `vpc-004c4f6f228ce6050` ↔ default `vpc-0bf9223b5ad1e995a` — **required** for API Lambda → shared `grubpac-v2`; do not remove |

| Redis SG | `sg-0ce5684ac8b0d778e` | Redis 6379 from Lambda SG |



Template: `infrastructure/grubfleet-network.yaml`



## Shared ERP PostgreSQL (`grubpac-v2`)



As of **2026-10-01**, GrubFleet ERP Postgres for all tiers runs on one shared RDS instance (not per-tier `grubfleet-data-*` RDS). **Redis** remains per-tier from `grubfleet-data-*` stacks (unchanged).



| Resource | Value |

|----------|--------|

| RDS identifier | `grubpac-v2` |

| Host | `grubpac-v2.c3e2ke8yg11n.ap-south-1.rds.amazonaws.com` |

| Port | `5432` |

| Security group | `sg-051971289031e4d64` |

| Ingress (ERP Lambda) | TCP `5432` from GrubFleet private subnets `10.42.10.0/24`, `10.42.11.0/24` |

| VPC reachability | Peering `pcx-0ce6f67302db55f59` (GrubFleet VPC ↔ default VPC where `grubpac-v2` lives) — **do not remove** |



| Logical database | Environment(s) | Notes |

|------------------|----------------|--------|

| `grubfleet_erp_nonprod` | Staging only | GitHub Environment `staging` `DATABASE_URL`; gitignored `samconfig.staging.toml` |

| `grubfleet_erp_preprod` | Pre-prod only | GitHub Environment `pre-production` `DATABASE_URL`; gitignored `samconfig.preprod.toml` (split **2026-10-08**) |

| `grubfleet_erp_production` | Production | GitHub Environment `production` `DATABASE_URL` |



Full connection strings (user, password, URL) are **not** in git — gitignored `samconfig.*.toml`, GitHub Environment secrets, and local `.project-tracking/` only.



### Decommissioned per-tier ERP RDS (2026-10-01)



| Former identifier | Status | Final snapshot (naming pattern) |

|-------------------|--------|-----------------------------------|

| `grubfleet-staging-postgres` | Removed / deleting | `grubfleet-staging-postgres-final-20261001` |

| `grubfleet-preprod-postgres` | Removed / deleting | `grubfleet-preprod-postgres-final-20261001` |

| `grubfleet-production-postgres` | Removed / deleting | `grubfleet-production-postgres-final-20261001` |



Former hosts (`grubfleet-*-postgres.c3e2ke8yg11n.ap-south-1.rds.amazonaws.com`) are obsolete. Cutover record: `.project-tracking/infrastructure-rds-cutover.local.md`.



## Data tiers — Redis (`grubfleet-data-tier.yaml`)



Per-tier stack: `grubfleet-data-<tier>` where `<tier>` is `staging`, `preprod`, or `production`. Stacks still provision **ElastiCache Redis** per environment; ERP RDS in these stacks is decommissioned (template/stack cleanup may follow).



Pre-prod Redis sizing: `cache.t4g.micro` (see template `TierSizing` map).



### Staging (`grubfleet-data-staging`)



| Resource | Value |

|----------|--------|

| ERP Postgres | Shared `grubpac-v2` → DB `grubfleet_erp_nonprod` |

| Redis cluster id | `grubfleet-staging-redis` |

| Redis host | `grubfleet-staging-redis.s9s067.0001.aps1.cache.amazonaws.com` |

| Redis port | `6379` |



### Pre-prod (`grubfleet-data-preprod`)



| Resource | Value |

|----------|--------|

| ERP Postgres | Shared `grubpac-v2` → DB `grubfleet_erp_preprod` |

| Redis cluster id | `grubfleet-preprod-redis` |

| Redis host | `grubfleet-preprod-redis.s9s067.0001.aps1.cache.amazonaws.com` |

| Redis port | `6379` |



### Production (`grubfleet-data-production`)



| Resource | Value |

|----------|--------|

| ERP Postgres | Shared `grubpac-v2` → DB `grubfleet_erp_production` |

| Redis cluster id | `grubfleet-production-redis` |

| Redis host | `grubfleet-production-redis.s9s067.0001.aps1.cache.amazonaws.com` |

| Redis port | `6379` |



`REDIS_URL` and tier-specific secrets remain in gitignored `samconfig.*.toml` and GitHub Environment secrets. See [environments.md](./environments.md) for `DATABASE_URL` / `REDIS_URL` per tier.



## API tiers (SAM — `template.yaml`)



### Staging portal (`grubfleet-portal-staging`)

| Resource | Value |
|----------|--------|
| Portal URL | `https://d3swe5av2h6i8p.cloudfront.net` |
| CloudFront distribution | `E2P1321QJMJTG0` |
| S3 bucket | `grubfleet-portal-staging-662252246711` |

### Staging (`grubfleet-api-staging`)



| Resource | Value |

|----------|--------|

| Lambda function | `grubfleet-api-staging` |

| Lambda ARN | `arn:aws:lambda:ap-south-1:662252246711:function:grubfleet-api-staging` |

| HTTP API base URL | `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com` |

| Nest API prefix | `/api/v1` (e.g. health: `GET .../api/v1/health`) |

| `ClientOrigin` (CORS) | `https://d3swe5av2h6i8p.cloudfront.net,http://localhost:3000` |

| VPC | Private subnets + Lambda SG (see network) |

| Reserved concurrency | `0` (account concurrent limit 10) |



**Status:** `GET /api/v1/health` returns **200**.



### Pre-prod (`grubfleet-api-preprod`)



| Resource | Value |

|----------|--------|

| Lambda function | `grubfleet-api-preprod` |

| Lambda ARN | `arn:aws:lambda:ap-south-1:662252246711:function:grubfleet-api-preprod` |

| HTTP API base URL | `https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com` |

| Nest API prefix | `/api/v1` |

| `ClientOrigin` (CORS) | `https://d2fyfrapktmstq.cloudfront.net,http://localhost:3000` (via SAM) |

| VPC | Private subnets + Lambda SG |

| Reserved concurrency | `10` |

| Warmup schedule | On (`EnableWarmupSchedule=true`) |



**Status:** Migrations + seed applied; health + login smoke OK.



### Production (`grubfleet-api-production`)



| Resource | Value |

|----------|--------|

| Lambda function | `grubfleet-api-production` |

| Lambda ARN | `arn:aws:lambda:ap-south-1:662252246711:function:grubfleet-api-production` |

| HTTP API base URL | `https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com` |

| Nest API prefix | `/api/v1` |

| `ClientOrigin` (CORS) | `https://d30hrnureiq1oz.cloudfront.net` (production portal only) |

| VPC | Private subnets + Lambda SG |

| Reserved concurrency | `0` (account concurrent limit 10; increase in AWS before reserving) |



**Status:** Migrations and seed applied from laptop via `scripts/run-migrate-from-samconfig.ps1` / `run-seed-from-samconfig.ps1`. Smoke: `GET /api/v1/health`, `GET /api/v1/health/ready`, login, `/auth/me` OK.



## IAM (GitHub Actions)



| Resource | ARN / name | Notes |

|----------|------------|--------|

| OIDC provider | `arn:aws:iam::662252246711:oidc-provider/token.actions.githubusercontent.com` | GitHub Actions |

| Deploy role | `arn:aws:iam::662252246711:role/GrubFleetGitHubActionsDeploy` | Trust: `repo:himanshu-grubpac/GrubFleet-ERP:*` |

| Inline policy | `GrubFleetSamApiDeploy` on role above | Scoped SAM API deploy (CFN stacks `grubfleet-api-*`, SAM artifact S3 bucket, Lambda, HTTP API, EventBridge warmup, execution roles). Policy JSON in repo: `scripts/iam-grubfleet-gha-sam-deploy-policy.json` |



Current GHA workflows (`.github/workflows/reusable-container-deploy.yml`) still use **container/blue-green placeholders**; wire `AWS_ROLE_ARN` + SAM steps when CI deploy to Lambda is ready.



## S3 (SAM artifacts)



| Bucket | Purpose |

|--------|---------|

| `aws-sam-cli-managed-default-samclisourcebucket-mzdreqfkqpb1` | SAM CLI upload bucket for `grubfleet-api-*` deploys |



## Repo artifacts map



| Path | Role |

|------|------|

| `infrastructure/grubfleet-network.yaml` | Shared VPC stack |

| `infrastructure/grubfleet-data-tier.yaml` | Per-environment Redis (ERP RDS on shared `grubpac-v2`) |

| `template.yaml` | SAM — Lambda + HTTP API |

| `scripts/deploy-grubfleet-data-and-samconfig.ps1` | Deploy data stacks; write gitignored `samconfig.*.toml` |

| `scripts/prepare-lambda.mjs` | Nest build + `dist/` + prod `node_modules` for Lambda |

| `scripts/stage-sam-artifacts.mjs` | Stage `.aws-sam/build` without SAM Node builder (Windows) |

| `scripts/sam-deploy.mjs` | `sam deploy` with absolute config path (Windows paths with spaces) |
| `scripts/write-samconfig-from-env.mjs` | CI: build gitignored `samconfig.<tier>.toml` from Environment secrets/vars before GHA SAM deploy |

| `scripts/bootstrap-production-data-and-samconfig.ps1` | One-time prod data bootstrap + `samconfig.production.toml` |

| `scripts/run-migrate-from-samconfig.ps1` / `run-seed-from-samconfig.ps1` | DB migrate/seed per tier from gitignored samconfig |

| `scripts/iam-grubfleet-gha-sam-deploy-policy.json` | Reference IAM policy for GHA SAM deploy |

| `samconfig.staging.example.toml` | Committed template (no secrets) |

| `samconfig.*.toml` | **Gitignored** — secrets and parameter overrides |

| `.aws-deploy-meta.local.json` | **Gitignored** — hostnames / stack names per tier |



## Operational commands



Profile and region for all commands:



```powershell

$Profile = "grubfleet-erp"

$Region = "ap-south-1"

```



List GrubFleet stacks:



```powershell

aws cloudformation list-stacks --profile $Profile --region $Region `

  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_IN_PROGRESS `

  --query "StackSummaries[?contains(StackName, 'grubfleet')].[StackName,StackStatus]" --output table

```



Describe network outputs:



```powershell

aws cloudformation describe-stacks --profile $Profile --region $Region `

  --stack-name grubfleet-network --query "Stacks[0].Outputs" --output table

```



Redeploy API (from repo root; uses `scripts/sam-deploy.mjs` for Windows-safe paths):



```powershell

npm run deploy:staging:api

npm run deploy:preprod:api

npm run deploy:production:api

```



Migrations / seed per tier (parses `DatabaseUrl` from gitignored `samconfig.<tier>.toml`):



```powershell

powershell -File scripts/run-migrate-from-samconfig.ps1 -Tier preprod

powershell -File scripts/run-seed-from-samconfig.ps1 -Tier preprod

```



ERP migrate/seed from a laptop uses gitignored `samconfig.<tier>.toml` (`DatabaseUrl` → `grubpac-v2`). Ensure your client can reach the shared instance (security group / VPN / bastion per ops policy). GHA `db-migrate` on staging/pre-prod may need `RDS_MIGRATION_SECURITY_GROUP_ID` updated to `grubpac-v2` SG (`sg-051971289031e4d64`) — see cutover follow-ups in `.project-tracking/infrastructure-rds-cutover.local.md`.



Health smoke:



```powershell

curl.exe -sS "https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com/api/v1/health"

curl.exe -sS "https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com/api/v1/health"

curl.exe -sS "https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com/api/v1/health"

```


