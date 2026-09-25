# GrubFleet ERP — AWS resource inventory



**Last updated:** 2026-09-25



## Overview



| Item | Value |

|------|--------|

| AWS account | `662252246711` |

| CLI profile | `grubfleet-erp` |

| Region | `ap-south-1` (Mumbai) |

| Naming prefix | `grubfleet-*` |



This inventory covers **GrubFleet-ERP only**. It does **not** include attendance-web, GrubAdmin pilot EC2, or other vertical stacks.

## Live API & portal URLs (maintain on redeploy)

GrubFleet **frontend is not hosted on AWS yet** (no CloudFront/Amplify URL). Use local Next.js (`http://localhost:3000`) with `NEXT_PUBLIC_API_BASE_URL` below. **CORS** on all tiers is currently `http://localhost:3000`.

| Tier | Frontend portal | HTTP API (SAM output) | `NEXT_PUBLIC_API_BASE_URL` | Health smoke |
|------|-----------------|------------------------|----------------------------|--------------|
| Staging | *(local dev)* | `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com` | `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com/api/v1` | `GET .../api/v1/health` |
| Pre-prod | *(local dev)* | `https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com` | `https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com/api/v1` | `GET .../api/v1/health` |
| Production | *(not deployed)* | `https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com` | `https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com/api/v1` | `GET .../api/v1/health` |

| Tier | OpenAPI / Swagger (when API is up) |
|------|-------------------------------------|
| All | `{NEXT_PUBLIC_API_BASE_URL}/docs` (e.g. staging: `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com/api/v1/docs`) |

**Seed admin (all tiers after migrate/seed):** `admin@grubpac.local` — password in local `SEED_CREDENTIALS.local.md` only (not in git).

## CloudFormation stacks



| Stack | Purpose | Status (live) |

|-------|---------|---------------|

| `grubfleet-network` | Shared VPC, subnets, security groups | `CREATE_COMPLETE` |

| `grubfleet-data-staging` | RDS + Redis (staging) | `UPDATE_COMPLETE` |

| `grubfleet-data-preprod` | RDS + Redis (pre-prod) | `CREATE_COMPLETE` |

| `grubfleet-data-production` | RDS + Redis (production) | `CREATE_COMPLETE` |

| `grubfleet-api-staging` | SAM — Lambda + HTTP API (staging) | `UPDATE_COMPLETE` |

| `grubfleet-api-preprod` | SAM API (pre-prod) | `CREATE_COMPLETE` |

| `grubfleet-api-production` | SAM API (production) | `CREATE_COMPLETE` (health + auth smoke OK) |



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

| RDS SG | `sg-0198b9781297f8bf7` | PostgreSQL 5432 from Lambda SG (+ optional migration CIDR) |

| Redis SG | `sg-0ce5684ac8b0d778e` | Redis 6379 from Lambda SG |



Template: `infrastructure/grubfleet-network.yaml`



## Data tiers (`grubfleet-data-tier.yaml`)



Per-tier stack: `grubfleet-data-<tier>` where `<tier>` is `staging`, `preprod`, or `production`.



Pre-prod sizing: `db.t3.small`, Redis `cache.t4g.micro` (see template `TierSizing` map).



### Staging (`grubfleet-data-staging`)



| Resource | Value |

|----------|--------|

| RDS identifier | `grubfleet-staging-postgres` |

| Engine | PostgreSQL 16.15 |

| DB name | `grubfleet_staging` |

| RDS host | `grubfleet-staging-postgres.c3e2ke8yg11n.ap-south-1.rds.amazonaws.com` |

| Port | `5432` |

| Publicly accessible | Yes (migrations from trusted client CIDR) |

| Redis cluster id | `grubfleet-staging-redis` |

| Redis host | `grubfleet-staging-redis.s9s067.0001.aps1.cache.amazonaws.com` |

| Redis port | `6379` |



### Pre-prod (`grubfleet-data-preprod`)



| Resource | Value |

|----------|--------|

| RDS identifier | `grubfleet-preprod-postgres` |

| Engine | PostgreSQL 16.15 |

| DB name | `grubfleet_preprod` |

| RDS host | `grubfleet-preprod-postgres.c3e2ke8yg11n.ap-south-1.rds.amazonaws.com` |

| Port | `5432` |

| Publicly accessible | Yes (bootstrap migrations; update `MigrationClientCidr` when your IP changes) |

| Redis cluster id | `grubfleet-preprod-redis` |

| Redis host | `grubfleet-preprod-redis.s9s067.0001.aps1.cache.amazonaws.com` |

| Redis port | `6379` |



### Production (`grubfleet-data-production`)



| Resource | Value |

|----------|--------|

| RDS identifier | `grubfleet-production-postgres` |

| Engine | PostgreSQL 16.15 |

| DB name | `grubfleet_production` |

| RDS host | `grubfleet-production-postgres.c3e2ke8yg11n.ap-south-1.rds.amazonaws.com` |

| Port | `5432` |

| Publicly accessible | No (private subnets) |

| Redis cluster id | `grubfleet-production-redis` |

| Redis host | `grubfleet-production-redis.s9s067.0001.aps1.cache.amazonaws.com` |

| Redis port | `6379` |



Credentials (master user `grubfleet`, passwords, full `DATABASE_URL`) are **not** stored in git. They live in gitignored `samconfig.*.toml` and CloudFormation parameters.



## API tiers (SAM — `template.yaml`)



### Staging (`grubfleet-api-staging`)



| Resource | Value |

|----------|--------|

| Lambda function | `grubfleet-api-staging` |

| Lambda ARN | `arn:aws:lambda:ap-south-1:662252246711:function:grubfleet-api-staging` |

| HTTP API base URL | `https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com` |

| Nest API prefix | `/api/v1` (e.g. health: `GET .../api/v1/health`) |

| `ClientOrigin` (CORS) | `http://localhost:3000` |

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

| `ClientOrigin` (CORS) | `http://localhost:3000` |

| VPC | Private subnets + Lambda SG |

| Reserved concurrency | `0` |

| Warmup schedule | Off (`EnableWarmupSchedule=false`) |



**Status:** Migrations + seed applied; health + login smoke OK.



### Production (`grubfleet-api-production`)



| Resource | Value |

|----------|--------|

| Lambda function | `grubfleet-api-production` |

| Lambda ARN | `arn:aws:lambda:ap-south-1:662252246711:function:grubfleet-api-production` |

| HTTP API base URL | `https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com` |

| Nest API prefix | `/api/v1` |

| `ClientOrigin` (CORS) | `http://localhost:3000` (update when prod FE URL is known) |

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

| `infrastructure/grubfleet-data-tier.yaml` | Per-environment RDS + Redis |

| `template.yaml` | SAM — Lambda + HTTP API |

| `scripts/deploy-grubfleet-data-and-samconfig.ps1` | Deploy data stacks; write gitignored `samconfig.*.toml` |

| `scripts/prepare-lambda.mjs` | Nest build + `dist/` + prod `node_modules` for Lambda |

| `scripts/stage-sam-artifacts.mjs` | Stage `.aws-sam/build` without SAM Node builder (Windows) |

| `scripts/sam-deploy.mjs` | `sam deploy` with absolute config path (Windows paths with spaces) |

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



If RDS migrate times out from your laptop, update pre-prod (or staging) data stack `MigrationClientCidr` to your current public IP (`/32`) while `RdsPubliclyAccessible=true`.



Health smoke:



```powershell

curl.exe -sS "https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com/api/v1/health"

curl.exe -sS "https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com/api/v1/health"

curl.exe -sS "https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com/api/v1/health"

```


