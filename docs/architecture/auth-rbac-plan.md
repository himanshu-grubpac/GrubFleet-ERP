# Auth & RBAC — implementation plan

> **Status:** Planned. Schema and module folders exist; login and guards are not wired.

## Goals

- Email + password login (extendable to SSO later)
- Short-lived access JWT + rotating refresh tokens (table `refresh_tokens`)
- Organization-scoped RBAC with a global permission catalog
- Audit log entries for security-sensitive actions

## Planned API surface (`/api/v1`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login` | Returns access + refresh |
| POST | `/auth/refresh` | Rotates refresh token |
| POST | `/auth/logout` | Revokes refresh |
| GET | `/auth/me` | User + org memberships + effective permissions |

## Authorization model (provisional)

1. **Permission catalog** — rows in `permissions` (`module:ACTION`, e.g. `fleet:VIEW`).
2. **Roles** — org-scoped or `system` scope; linked via `role_permissions`.
3. **Assignments** — `user_roles` with optional `organization_id` for tenant scope.

Open product questions (e.g. refresh-token storage, SSO timeline) should be captured in the team backlog or issue tracker before implementation.

## Backend implementation steps

1. `AuthModule`: Passport/JWT or `@nestjs/jwt`, password hashing (argon2/bcrypt).
2. Global `PermissionsGuard` + `@RequirePermissions()` decorator reading cached permission set (Redis).
3. Services: `UsersService`, `OrganizationsService`, `RolesService`, `AuditService`.
4. Migrations applied in CI/deploy; run `npm run db:seed -w backend` for catalog.
5. OpenAPI security scheme already declared; document login DTOs in Swagger.

## Frontend implementation

- Store access token in memory; refresh via httpOnly cookie or secure refresh flow (TBD with backend).
- Use `filterNavByPermissions` once `/auth/me` returns permission keys.
- See `docs/frontend-integration-guide.md`.
