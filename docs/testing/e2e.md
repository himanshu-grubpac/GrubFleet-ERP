# Frontend E2E (Playwright)

Organisation smoke lives in `apps/frontend/e2e/organisation-smoke.spec.ts`. It covers login, locations/employees list load, API-backed fixture creation, and employee deactivate through the portal UI.

## Prerequisites

- Local stack: Postgres + Redis + backend on port **4000**, frontend dev server on **3000** (or set URLs below).
- Dev admin seeded (`admin@grubpac.local` / `Grubpac123` by default).

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `E2E_BASE_URL` | `http://localhost:3000` | Portal origin for Playwright |
| `E2E_API_BASE_URL` | `http://localhost:4000/api/v1` | API for test fixtures |
| `E2E_ADMIN_EMAIL` | `admin@grubpac.local` | Login email |
| `E2E_ADMIN_PASSWORD` | `Grubpac123` | Login password |
| `E2E_SKIP_WEB_SERVER` | unset | Set to `1` when frontend is already running |

Copy optional overrides into `apps/frontend/.env.local` (Playwright reads process env; export vars in shell for CI).

## Commands

From repo root:

```powershell
npm install -w frontend @playwright/test
npx playwright install chromium -w frontend
npm run test:e2e -w frontend
```

With an existing dev server:

```powershell
$env:E2E_SKIP_WEB_SERVER="1"
npm run test:e2e -w frontend
```

Interactive UI mode:

```powershell
npm run test:e2e:ui -w frontend
```

## CI

No required GitHub Actions job yet. Run locally before promotion when Organisation flows change. See rule `.cursor/rules/26-erp-module-e2e-production-foundation.mdc`.
