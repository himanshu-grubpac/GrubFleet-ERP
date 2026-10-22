# Fleet + beta environment bootstrap

**Fleet + beta** is a **pre-prod-class** AWS tier: same promotion step as pre-prod (code from **staging**), separate infra and **`grubfleet_erp_fleet_beta`** on shared RDS **`grubpac-v2`**.

## Git and promotion

| Item | Value |
|------|--------|
| Branch | `fleet-beta` |
| GitHub Environment | `fleet-beta` |
| Backend `APP_ENV` | `fleetbeta` |
| Deploy workflow | `.github/workflows/deploy-fleet-beta.yml` (push `fleet-beta`) |

Promotion (with pre-prod):

```text
develop → PR → staging → deploy staging
staging → PR → pre-prod → deploy pre-prod + sync fleet-beta branch → deploy fleet-beta
pre-prod → PR → main → production
```

After **`pre-prod`** receives a merge, **`sync-fleet-beta-with-preprod.yml`** fast-forwards **`fleet-beta`** to the same commit, then **`deploy-fleet-beta.yml`** runs.

Optional: also open **`staging` → `fleet-beta`** PR when you want beta ahead of pre-prod (normally sync is enough).

## One-time AWS / GitHub setup

1. **Postgres (shared RDS)**  
   Create logical DB (same user as other ERP tiers):

   ```powershell
   cd "c:\Users\salun\Downloads\Company Data\GrubFleet-ERP"
   # Use maintenance DB — set from any tier samconfig or postgres superuser URL
   $env:DATABASE_URL = "<parse DatabaseUrl from samconfig.preprod.toml>"
   node scripts/provision-grubfleet-erp-database.mjs grubfleet_erp_fleet_beta
   npm run db:migrate -w backend   # with DATABASE_URL pointing at grubfleet_erp_fleet_beta
   ```

2. **Redis data stack** (ElastiCache only on shared RDS model):

   ```powershell
   aws cloudformation deploy `
     --stack-name grubfleet-data-fleetbeta `
     --template-file infrastructure/grubfleet-data-tier.yaml `
     --parameter-overrides Tier=fleetbeta RdsPubliclyAccessible=false `
     --profile grubfleet-erp --region ap-south-1
   ```

3. **Portal stack**

   ```powershell
   npm run deploy:fleetbeta:portal-stack
   ```

4. **API stack** — copy `samconfig.fleetbeta.example.toml` → `samconfig.fleetbeta.toml`, set:
   - `DatabaseUrl` → `grubfleet_erp_fleet_beta` on `grubpac-v2`
   - `RedisUrl` from `grubfleet-data-fleetbeta` outputs
   - JWT secrets, `ClientOrigin` = Fleet + beta CloudFront URL + `http://localhost:3000`

5. **GitHub Environment `fleet-beta`** — mirror **pre-production** secrets/vars:
   - `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `AWS_ROLE_ARN`
   - `NEXT_PUBLIC_API_BASE_URL`, `PORTAL_S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`
   - `SAM_CLIENT_ORIGIN`, `CORS_ORIGIN`, `DEPLOY_HEALTH_URL`
   - `RDS_MIGRATION_SECURITY_GROUP_ID`, `VPC_*` as for pre-prod

6. **Remote branch**

   ```powershell
   git checkout develop
   git pull origin develop
   git checkout -b fleet-beta
   git push -u origin fleet-beta
   ```

7. **First deploy** — merge **staging → pre-prod** (or push `fleet-beta` after sync) and confirm **Deploy Fleet + beta** in Actions.

## Local branch

Track remote after bootstrap:

```powershell
git fetch origin
git checkout fleet-beta
git pull origin fleet-beta
```

Daily integration stays on **`develop`**; **`fleet-beta`** updates via pre-prod sync unless you merge to it explicitly.
