# Local CI before push (develop)

GitHub Actions **CI** on `develop` runs migrate → lint → typecheck → test → build (backend + frontend). To catch failures **before** push:

## One command (manual)

With **Postgres + Redis** up (e.g. `npm run dev` Docker stack):

```powershell
npm run ci:local
```

Then commit and push yourself when it passes.

## Automatic (Husky pre-push)

After `npm install` at repo root, **every** `git push` runs `npm run ci:local` first.

Hook file: `.husky/pre-push` (Husky v9 format — no `husky.sh` import; required before Husky v10).

Emergency skip (not for routine use):

```powershell
$env:SKIP_PREPUSH="1"; git push origin develop
# or
$env:HUSKY="0"; git push origin develop
```

## What this does not run

- Playwright E2E (optional; run `npm run test:e2e -w frontend` separately)
- Staging/production deploy

## Align with CI

Local gate uses the same env defaults as `.github/workflows/ci.yml` (`NODE_ENV=test`, local Postgres/Redis URLs, CI JWT placeholders).
