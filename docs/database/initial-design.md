# Database — initial design (auth / RBAC foundation)

ORM: Drizzle. Migrations: `apps/backend/drizzle/`.

## Core entities

- **organizations** — tenant root (slug unique).
- **companies** — legal entities under an org (provisional; may merge with org per product).
- **users** — global identity by email.
- **memberships** — user ↔ organization with status.
- **permissions** — catalog keys (`module:VIEW` / `module:MANAGE`).
- **roles** — org-scoped or system scope.
- **role_permissions** — M2M.
- **user_roles** — assignments with org context when applicable.
- **refresh_tokens** — hashed refresh token storage.
- **audit_logs** — append-only security/audit trail.

## Commands

```bash
docker compose up -d
npm run db:generate -w backend   # after schema changes
npm run db:migrate -w backend
npm run db:seed -w backend       # idempotent permission catalog
```

## Indexes

Unique indexes on slugs, emails, permission keys, and assignment tuples are defined in schema. Review before production scale-out.
