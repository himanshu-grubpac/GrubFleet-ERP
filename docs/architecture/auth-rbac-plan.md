# Auth & RBAC — implementation plan

> **Status:** Phase 1 (Mohit module-level model) implemented. JWT auth, permission guards, Redis-backed permission cache, and administration CRUD APIs are live under `/api/v1`.

## Goals

- Email + password login (extendable to SSO later)
- Short-lived access JWT + rotating refresh tokens (table `refresh_tokens`)
- Organization-scoped RBAC with a global permission catalog
- Audit log entries for security-sensitive actions

## API surface (`/api/v1`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login` | Returns access + refresh |
| POST | `/auth/refresh` | Rotates refresh token |
| POST | `/auth/logout` | Revokes refresh |
| GET | `/auth/me` | User + org memberships + `permissionKeys` + `moduleAccess` |
| GET | `/organizations` | Paginated orgs the user can access |
| GET | `/organizations/:id` | Detail (member or system admin) |
| GET | `/users?organizationId=` | Members (`administration.view`) |
| POST | `/users` | Create user + membership (`administration.manage`) |
| PATCH | `/users/:id` | Update user (`administration.manage`, org context) |
| GET | `/permissions` | Catalog (`administration.view`) |
| GET | `/modules?organizationId=` | Sidebar module registry for role editor |
| GET | `/roles?organizationId=` | Org roles (`administration.view`) |
| GET | `/roles/editor-matrix?organizationId=` | NONE/VIEW/FULL rows per module |
| POST | `/roles` | Create role (`administration.manage`) — prefer `moduleAccess` body |
| PATCH | `/roles/:id` | Update role (`administration.manage`) |
| POST | `/roles/:id/assign` | Assign role (`administration.manage`) |
| DELETE | `/roles/:id/assign` | Remove assignment (`administration.manage`) |
| GET | `/audit?organizationId=` | Audit log (`administration.view`) |

Org-scoped admin routes require `X-Organization-Id` and/or `organizationId` query (or body on POST). Permission checks use AND semantics on `@RequirePermissions`.

## Authorization model (Phase 1)

1. **Permission catalog** — dot keys per sidebar module: `{module_id}.view` and `{module_id}.manage` (e.g. `fleet_leasing.view`).
2. **Role editor** — per module: **NONE**, **VIEW** (all `.view` keys), **FULL** (`.view` + `.manage`; future sub-perms under same prefix included in Phase 2).
3. **Roles** — org-scoped or `system` scope; linked via `role_permissions` (expanded keys server-side from `moduleAccess`).
4. **Assignments** — `user_roles` with optional `organization_id` for tenant scope.
5. **Delegation** — actor cannot grant module level or keys they do not hold (system roles bypass).

**Phase 2 gap:** Sub-nav categories, `CUSTOM` per-module permission matrix, and `{module_id}.*.sub` keys — see `.project-tracking/REQUIREMENTS_GAPS.local.md`.

## Backend implementation (done)

1. `AuthModule`: JWT access + bcrypt, refresh rotation, audit on auth events.
2. Global `PermissionsGuard` + `@RequirePermissions()` with Redis cache (org revision bump on role changes).
3. Module registry config + migration `0001_phase1_module_permissions.sql` from legacy `module:ACTION` keys.
4. Seed: Phase 1 catalog + dev org admin + system administrator role.
5. OpenAPI + Postman updated for admin routes.

## Frontend implementation

- Store access token in memory; refresh via httpOnly cookie or secure refresh flow (TBD with backend).
- Use `GET /auth/me` → `moduleAccess` for sidebar visibility (any level &gt; NONE) and `permissionKeys` for fine guards.
- See `docs/frontend-integration-guide.md`.
