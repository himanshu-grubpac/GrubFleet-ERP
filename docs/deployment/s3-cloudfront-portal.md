# Static portal — S3 + CloudFront (no Amplify)

GrubFleet ERP hosts the Next.js portal as a **static export** on **private S3** behind **CloudFront OAC**. The API remains on **SAM Lambda + HTTP API** per tier.

| Item | Value |
|------|--------|
| Region | `ap-south-1` |
| CLI profile | `grubfleet-erp` |
| Portal stacks | `grubfleet-portal-staging`, `grubfleet-portal-preprod`, `grubfleet-portal-production` |
| S3 bucket pattern | `grubfleet-portal-{tier}-662252246711` |

## Architecture

1. **Build** — `NEXT_STATIC_EXPORT=true` → Next.js `output: 'export'` → `apps/frontend/out/`
2. **Publish** — `aws s3 sync` to tier bucket; `aws cloudfront create-invalidation`
3. **CORS** — SAM `ClientOrigin` drives API Gateway and Lambda (`template.yaml`). Staging/pre-prod: `https://{cloudfront-domain},http://localhost:3000`; production: portal HTTPS only. No trailing slash on portal URL.

Docker / local dev keeps **`output: 'standalone'`** (no `NEXT_STATIC_EXPORT`).

## One-time: deploy portal stack

From repo root (Windows PowerShell):

```powershell
npm run deploy:staging:portal-stack
# preprod / production when ready:
npm run deploy:preprod:portal-stack
npm run deploy:production:portal-stack
```

Note stack outputs: `PortalUrl`, `PortalBucketName`, `CloudFrontDistributionId`.

## Manual publish (local)

```powershell
npm run sync:staging:portal
```

Optional: pass API URL if it differs from defaults in `scripts/sync-portal.ps1`.

## Update API CORS after portal URL exists

```powershell
.\scripts\update-sam-client-origin.ps1 -Tier staging
# -ConfigOnly to patch samconfig only without redeploy
```

Then verify login from the CloudFront URL (browser sends `Origin: https://dxxx.cloudfront.net`).

## GitHub Actions

Job **`frontend-portal-s3-cloudfront`** in `.github/workflows/reusable-container-deploy.yml` runs on staging / pre-prod / production deploy workflows.

Configure per **GitHub Environment** (`staging`, `pre-production`, `production`):

| Name | Type | Purpose |
|------|------|---------|
| `AWS_ROLE_ARN` | Secret | IAM role for OIDC (`token.actions.githubusercontent.com`) |
| `NEXT_PUBLIC_API_BASE_URL` | Variable | e.g. `https://{execute-api-id}.execute-api.ap-south-1.amazonaws.com/api/v1` |
| `PORTAL_S3_BUCKET` | Variable | From stack output `PortalBucketName` |
| `CLOUDFRONT_DISTRIBUTION_ID` | Variable | From stack output `CloudFrontDistributionId` |
| `AWS_REGION` | Variable | Optional; default `ap-south-1` |

If `PORTAL_S3_BUCKET` or `AWS_ROLE_ARN` is unset, the workflow still builds and uploads the `out/` artifact but **skips** S3 sync (logged message).

Extend the GHA IAM role with S3 sync + CloudFront invalidation on the portal bucket/distribution. Example statement: `scripts/iam-grubfleet-gha-portal-deploy-policy.json`.

After each portal deploy, set **`ClientOrigin`** on the matching SAM stack (script above or edit `samconfig.<tier>.toml` and `npm run deploy:<tier>:api`).

## Routing

CloudFront serves `index.html` at `/` and maps **403/404 → `/index.html`** for client-side navigation on unknown paths. Next export uses `trailingSlash: true` so routes resolve as `/login/index.html` on S3.

**Do not browse `index.txt` URLs.** Next.js 15 static export also writes `index.txt` (RSC flight payloads) beside each route. Opening e.g. `/dashboard/index.txt` shows raw flight JSON (including embedded 404 fallback slots in the tree). Use **`/dashboard/`** (trailing slash). The portal stack’s viewer-request function rewrites non-RSC `*.txt` requests to the matching `index.html`; redeploy `grubfleet-portal-{tier}` after changing `infrastructure/grubfleet-portal.yaml`.

**Dynamic resource IDs (static export):** Next cannot emit `index.html` per UUID at build time. Use a **fixed static route** (e.g. `/fleet-leasing/lease-contracts/detail/`) and pass the id via **`?leaseId=`** in links and bookmarks. The portal stack’s **viewer-request CloudFront function** rewrites legacy path-style URLs (`/fleet-leasing/lease-contracts/{id}/`) to that shell and injects `leaseId` on the query string so refresh and direct links work without falling back to root `/index.html` (which would redirect authenticated users away from the detail view). Apply the same pattern for other modules with runtime ids until a server-rendered host is used.

## Related docs

- [AWS resource inventory](./aws-resources.md)
- [SAM manual deploy](./sam-manual-deploy.md)
- [Blue-green / GHA](./blue-green.md) — container images remain on GHCR; portal path is S3+CloudFront
