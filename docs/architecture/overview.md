# GrubPac ERP — architecture overview

## Style

Modular monolith: one deployable NestJS API and one Next.js web app. Domain boundaries live in Nest modules under `apps/backend/src/modules/`, not separate microservices.

## Runtime

| Component | Technology |
|-----------|------------|
| API | NestJS 11, TypeScript strict |
| Web | Next.js 15 App Router |
| Database | PostgreSQL 16, Drizzle ORM |
| Cache | Redis 7 |
| Contracts | `packages/api-contracts`, `shared-types`, `validation` |

## Request flow

1. Browser → Next.js (UI, TanStack Query)
2. Next.js → Nest `/api/v1/*` (JSON, Bearer JWT on protected routes)
3. Nest → PostgreSQL / Redis
4. Errors → consistent JSON envelope with `correlationId`

## Foundation scope (this repo state)

Implemented: health probes, OpenAPI, env validation, Drizzle auth/RBAC schema, module scaffolds, permission seed script, frontend app shell and module placeholders.

Auth phase 1: login, refresh, logout, `/auth/me`, JWT guards. Not yet: permission guards on domain routes, CRUD for org/users/roles, business modules (fleet, finance, etc.).

See `docs/architecture/auth-rbac-plan.md` for the auth roadmap.
