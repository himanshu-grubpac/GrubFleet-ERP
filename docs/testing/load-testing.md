# Load testing (Organisation lists)

Skeleton script for k6 — not a merge gate until you run against staging and record baselines.

## Script

`scripts/load/k6-organisation-lists.js` — authenticated GET for:

- `GET /api/v1/organisation/locations` (paginated)
- `GET /api/v1/organisation/employees` (paginated)

## Install k6

- Windows: `choco install k6` or download from https://k6.io/docs/get-started/installation/
- macOS: `brew install k6`

## Run (staging example)

```powershell
$env:K6_API_BASE_URL="https://<staging-api-host>/api/v1"
$env:K6_ORG_ID="<uuid>"
$env:K6_ACCESS_TOKEN="<jwt>"
$env:K6_VUS="10"
$env:K6_DURATION="30s"
k6 run scripts/load/k6-organisation-lists.js
```

Obtain a short-lived access token via login against the target tier; do not commit tokens.

## What to watch

- p95 latency for list endpoints under target VUs
- Error rate (401/403/5xx)
- RDS CPU and API Lambda duration (CloudWatch) during the run

Document baseline VUs, duration, and p95 in your release notes when you first run this on staging.
