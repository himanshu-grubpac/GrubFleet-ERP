# API documentation artifacts

Committed catalog for the live GrubPac ERP foundation API. Source of truth for **paths and response shapes** is the NestJS backend; update `openapi.yaml` and the Postman collection in the **same change** as any route change in `apps/backend`.

## Files

| File | Purpose |
|------|---------|
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.0.3 — all current GET endpoints |
| [`postman/GrubFleet-ERP.postman_collection.json`](postman/GrubFleet-ERP.postman_collection.json) | Postman Collection v2.1 |
| [`postman/GrubFleet-ERP.development.postman_environment.example.json`](postman/GrubFleet-ERP.development.postman_environment.example.json) | Example env — local (`baseUrl` only) |
| [`postman/GrubFleet-ERP.staging.postman_environment.example.json`](postman/GrubFleet-ERP.staging.postman_environment.example.json) | Example env — staging placeholder URL |
| [`postman/GrubFleet-ERP.preprod.postman_environment.example.json`](postman/GrubFleet-ERP.preprod.postman_environment.example.json) | Example env — pre-production placeholder URL |
| [`postman/GrubFleet-ERP.production.postman_environment.example.json`](postman/GrubFleet-ERP.production.postman_environment.example.json) | Example env — production placeholder URL |
| [`standards.md`](standards.md) | Base URL, errors, headers |

## Live Swagger

When the backend is running (`npm run start:dev -w backend`), interactive docs are at:

**http://localhost:4000/api/v1/docs**

Swagger is generated from controllers at runtime; `openapi.yaml` should match those routes after each API change.

## Import into Postman

1. **Collection:** Import → File → `docs/api/postman/GrubFleet-ERP.postman_collection.json`.
2. **Environment:** Import → `GrubFleet-ERP.development.postman_environment.example.json`, then **Duplicate** and save as a local environment (e.g. `GrubFleet-ERP.development.local`) if you change URLs.
3. Select the environment and confirm `baseUrl` is `http://localhost:4000/api/v1`.
4. Run **Health → Liveness** with the backend up.

**Optional — OpenAPI import:** Postman → Import → `docs/api/openapi.yaml` to refresh or compare; prefer updating the committed collection in the same PR as `openapi.yaml` so folder names and descriptions stay consistent.

## Import into Insomnia

1. Application → **Import/Export** → **Import Data** → **From File**.
2. Choose `docs/api/openapi.yaml` (OpenAPI 3).
3. Set base URL to `http://localhost:4000/api/v1` on the workspace or per request.

## Keeping artifacts in sync

1. Add or change a controller route in `apps/backend`.
2. Update `docs/api/openapi.yaml` (paths, schemas, examples).
3. Update `docs/api/postman/GrubFleet-ERP.postman_collection.json` (matching folder/request + description).
4. Smoke-test with backend running; compare with `/api/v1/docs` if needed.
5. Update [`docs/frontend-integration-guide.md`](../frontend-integration-guide.md) or `@grubpac/api-contracts` when those surfaces are part of the same feature.

Planned auth endpoints (`POST /auth/login`, refresh, logout, `GET /auth/me`) are **not** in the collection until implemented. When Auth MVP ships, extend OpenAPI and Postman in the same change set.

## Validation (local)

```powershell
node -e "JSON.parse(require('fs').readFileSync('docs/api/postman/GrubFleet-ERP.postman_collection.json','utf8')); console.log('collection OK')"
node -e "JSON.parse(require('fs').readFileSync('docs/api/postman/GrubFleet-ERP.development.postman_environment.example.json','utf8')); console.log('environment OK')"
```

Use an OpenAPI linter or IDE extension on `openapi.yaml` before commit.
