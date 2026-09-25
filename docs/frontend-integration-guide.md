# Frontend integration guide

## Environment

Create `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Never commit `.env.local`. Root `.env.example` lists shared variables.

Backend `CORS_ORIGIN` must include `http://localhost:3000` (default in `.env.example`).

## Current API surface (live today)

**Base:** `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:4000/api/v1`)  
**Swagger:** `{origin}/api/v1/docs`  
**Auth:** JWT Bearer on protected routes. **Public:** health, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/status`.

| Method | Path | Permission / notes |
|--------|------|------------------|
| GET | `/health` | Public — liveness |
| GET | `/health/ready` | Public — readiness (503 if down) |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | Bearer |
| GET | `/auth/me` | Bearer |
| GET | `/organizations` | Bearer — paginated orgs for caller |
| GET | `/organizations/:id` | Bearer — member or system admin |
| GET | `/users?organizationId=` | `administration.view` + org context |
| POST | `/users` | `administration.manage` — body includes `organizationId` |
| PATCH | `/users/:id` | `administration.manage` — `X-Organization-Id` or query |
| GET | `/permissions?organizationId=` | `administration.view` |
| GET | `/modules?organizationId=` | `administration.view` — sidebar module list |
| GET | `/roles?organizationId=` | `administration.view` |
| GET | `/roles/editor-matrix?organizationId=` | `administration.view` — role editor rows |
| POST | `/roles` | `administration.manage` — body `moduleAccess[]` preferred |
| PATCH | `/roles/:id` | `administration.manage` — org header/query |
| POST | `/roles/:id/assign` | `administration.manage` |
| DELETE | `/roles/:id/assign` | `administration.manage` |
| GET | `/audit?organizationId=` | `administration.view` |

Org context: `X-Organization-Id` header and/or `organizationId` query (POST bodies may include `organizationId`). Shapes: Swagger, OpenAPI, Postman.

Route constants: `@grubpac/api-contracts`. Types: `@grubpac/shared-types`.

**Postman / OpenAPI:** [`docs/api/README.md`](api/README.md) — import collection and environment example; pull latest after backend API updates.

**Hosted tiers:** API base URLs per environment — [`docs/deployment/environments.md`](deployment/environments.md).

## API client

Use `src/lib/api/client.ts` — `apiFetch<T>(path, { token })` throws `ApiClientError` with parsed backend error body.

## Auth flow

1. `POST /auth/login` with email/password → store `accessToken` (memory) + `refreshToken` (secure storage strategy TBD with FE).
2. Send `Authorization: Bearer <accessToken>` on protected calls.
3. On `401`, `POST /auth/refresh` once, then retry or redirect to `/login`.
4. `GET /auth/me` → `moduleAccess` for sidebar modules (level ≠ NONE) and `permissionKeys` for route guards.
5. `POST /auth/logout` when signing out.

Local dev API user: run `npm run db:seed -w backend` (credentials not in repo — ask backend owner).

## Permissions

Nav items should use `moduleAccess` from `/auth/me` (Phase 1 module ids: `fleet_leasing`, `asset_register`, etc.). Route guards use dot keys such as `administration.manage`.

## Shared types

Import DTOs from `@grubpac/shared-types` and form schemas from `@grubpac/validation` as they grow.

## UI stack

- Tailwind v4 + shadcn-style primitives under `src/components/ui/`
- TanStack Query provider in `src/providers/query-provider.tsx`
- React Hook Form + Zod on login placeholder
- TanStack Table: add per module when lists ship

## Frontend developer — sync and local run

Always integrate from **`develop`** (not old feature branches after their PRs are merged).

```powershell
cd <your-clone-path>\GrubFleet-ERP
git checkout develop
git pull origin develop
npm install
```

Create `apps/frontend/.env.local` (see **Environment** above). For API smoke tests, import Postman files under `docs/api/postman/` per [`docs/api/README.md`](api/README.md).

**Full stack locally** (backend + frontend):

```powershell
docker compose up -d
npm run db:migrate -w backend
npm run db:seed -w backend
npm run start:dev -w backend
```

In a second terminal:

```powershell
npm run dev -w frontend
```

- Frontend: http://localhost:3000  
- Backend Swagger: http://localhost:4000/api/v1/docs  

Dev login: after seed, ask the backend owner for credentials (not stored in git). Frontend-only UI work can use a mocked API or a shared dev backend URL when provided.

**Do not** commit `.env.local`, `.cursor/`, or `.project-tracking/`.

## Error / empty / loading

Reuse `src/components/states/async-states.tsx` patterns on every data view.
