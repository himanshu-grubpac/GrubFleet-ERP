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
**Auth on all routes:** none yet (no JWT guards).

| Method | Path | Use |
|--------|------|-----|
| GET | `/health` | **Real** — liveness (`status`, `service`) |
| GET | `/health/ready` | **Real** — Postgres + Redis + Drizzle (503 if down) |
| GET | `/auth/status` | Stub — `implemented: false` |
| GET | `/users/status` | Stub |
| GET | `/organizations/status` | Stub |
| GET | `/roles/status` | Stub |
| GET | `/permissions/status` | Stub |
| GET | `/audit/status` | Stub |

There are **no** `POST`/`PUT`/`PATCH`/`DELETE` endpoints yet. **Do not** build list/CRUD or login submit against invented shapes — wait for Auth MVP (`POST /auth/login`, `GET /auth/me`, etc.).

Route constants: `@grubpac/api-contracts`. Types: `@grubpac/shared-types`.

**Postman / OpenAPI:** [`docs/api/README.md`](api/README.md) — import collection and environment example; pull latest after backend API updates.

## API client

Use `src/lib/api/client.ts` — `apiFetch<T>(path, { token })` throws `ApiClientError` with parsed backend error body.

## Auth expectations (planned)

1. Login POST → access token + refresh (shape TBD).
2. Attach Bearer token to mutating requests.
3. On `401`, attempt refresh once, then redirect to `/login`.
4. Load permissions from `/auth/me` and pass into `filterNavByPermissions`.

Until auth ships, dashboard health check calls public `GET /health`.

## Permissions

Nav items declare provisional keys (`fleet:VIEW`, etc.) matching backend seed catalog. Names may change after product sign-off.

## Shared types

Import DTOs from `@grubpac/shared-types` and form schemas from `@grubpac/validation` as they grow.

## UI stack

- Tailwind v4 + shadcn-style primitives under `src/components/ui/`
- TanStack Query provider in `src/providers/query-provider.tsx`
- React Hook Form + Zod on login placeholder
- TanStack Table: add per module when lists ship

## Local run

```bash
docker compose up -d
npm install
npm run db:migrate -w backend
npm run db:seed -w backend
npm run start:dev -w backend
npm run dev -w frontend
```

Frontend: http://localhost:3000 — Backend: http://localhost:4000/api/v1/docs

## Error / empty / loading

Reuse `src/components/states/async-states.tsx` patterns on every data view.
