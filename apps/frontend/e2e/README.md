# Playwright smoke tests

Run with the full stack up (`npm run dev` at repo root or backend + frontend on `:4000` / `:3000`).

```powershell
cd apps/frontend
$env:E2E_SKIP_WEB_SERVER="1"
npx playwright test
```

| Spec | Journey |
|------|---------|
| `organisation-locations-smoke.spec.ts` | Login → locations list → API create → view → deactivate |
| `asset-register-asset-classes-smoke.spec.ts` | Login → asset class list |
| `lease-contracts-smoke.spec.ts` | Login → lease contracts list |
| `administration-roles-hierarchy-smoke.spec.ts` | Login → roles hierarchy |

Manual QA sign-off remains user-owned (see `.project-tracking/TASKS.local.md`).
