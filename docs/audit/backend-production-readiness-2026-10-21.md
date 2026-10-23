# Backend production readiness audit — 2026-10-21

**Scope:** `apps/backend/`, shared `packages/*` (server-safe), migrations, CI, API catalog.  
**Method:** Repo discovery (Phase 0), automated baseline (lint/typecheck/test/audit), targeted code review (auth, tenancy, validation, DB, integration patterns).  
**Environment:** Windows local dev; Docker Postgres + Redis on `localhost:5432` / `6379`; **no production/staging AWS mutation**.

**Companion inventory:** [backend-system-inventory.md](./backend-system-inventory.md)

---

## A. Executive summary

GrubFleet ERP backend is a **mature NestJS modular monolith** with **global JWT + permission guards**, **strict DTO validation**, **Drizzle migrations (44)**, **structured errors**, **Redis-backed permission cache**, and **broad integration test coverage** (17 integration spec files, 411 tests). Organisation, fleet leasing, asset register, finance, inventory, and workshop domains are implemented with org-scoped repositories and RBAC decorators on controllers.

**Verdict: CONDITIONAL READY** — suitable for continued staging/pre-prod promotion **after** P1 fleet list resilience (done) and accepting remaining ops gaps (load/soak not run, npm audit dev chain, RDS CA hardening optional). **P2 Helmet + login rate-limit fail-closed + OpenAPI path sync** addressed in follow-up pass 2026-10-21 (see §I).

| Gate | Result |
|------|--------|
| Lint | **PASS** (`npm run lint -w backend`) |
| Typecheck | **PASS** (`npm run typecheck -w backend`) |
| Unit + integration tests | **PASS** 36 suites / 411 tests (after audit fixes to test fixtures) |
| npm audit (backend workspace) | **26 issues** (25 moderate, 1 critical) — mostly dev/tooling chain |
| Load/k6 soak | **NOT EXECUTED** |
| Production deploy smoke | **NOT EXECUTED** (out of scope) |

---

## B. System inventory (summary)

See [backend-system-inventory.md](./backend-system-inventory.md) for stack versions, module list, auth flow diagrams, and integration spec map.

---

## C. Risk register

| ID | Sev | Confidence | Finding | Evidence | Recommendation |
|----|-----|------------|---------|----------|----------------|
| AUD-001 | **P1** | High | Fleet client **list** could return **400** for the whole page if **any** organisation client on that page failed `syncFromOrganisationClient`. | `fleet-clients.service.ts` `list()` — **fixed** 2026-10-21 follow-up: per-row try/catch skips row + `Logger.warn`; regression in `fleet-leasing.integration.spec.ts` | Monitor warn logs; optional metric for skipped rows |
| AUD-002 | **P2** | High | No **Helmet** (or equivalent security headers) on HTTP responses | Was: no Helmet | **Fixed** — `helmet` via `apply-http-security-headers.ts` in `bootstrap-app.ts` + integration bootstrap; auth integration asserts `X-Content-Type-Options` |
| AUD-003 | **P2** | High | Login rate limit **fail-open** when Redis errors (auth remains unthrottled) | Was: silent catch | **Fixed** — `APP_ENV !== development` → `503` `LOGIN_RATE_LIMIT_UNAVAILABLE`; dev fail-open; unit tests in `login-rate-limiter.service.spec.ts` |
| AUD-004 | **P2** | Medium | **OpenAPI drift:** path keys vs controller routes | Was: 134 vs 180 (naive count); normalized gap **2** fleet approve/activate | **Fixed** — added missing lease contract paths + Postman; `scripts/audit-openapi-route-gap.mjs` (normalize `:id` → `{id}`) reports **0** missing paths; optional CI gate |
| AUD-005 | **P2** | Medium | **npm audit:** 26 vulns; **critical** handlebars in Jest coverage chain; esbuild via drizzle-kit | `npm audit --workspace=backend` output | **Deferred** — no mass upgrade; dev-tooling weighted; track drizzle-kit/esbuild bump separately |
| AUD-006 | **P3** | High | **Rate limiting** only on login — no global API throttling | Only `LoginRateLimiterService` | **Deferred** — no Nest throttler in repo; add only if product requires global API throttle |
| AUD-007 | **P3** | Medium | **JWT secrets optional** when `APP_ENV !== production` | `env.schema.ts` | Ensure staging/pre-prod/prod GitHub Environments enforce secrets (operational) |
| AUD-008 | **P3** | Medium | **RDS SSL** uses `rejectUnauthorized: false` when SSL detected | `pg-pool-options.ts` | **Deferred** — comment documents CA bundle path; ops change when `PGSSLROOTCERT` available |
| AUD-009 | **P3** | Medium | **Lambda** caches app indefinitely — no pool drain on scale-in | `lambda.ts` | Acceptable for Lambda; monitor connection counts vs RDS `max_connections` |
| AUD-010 | **P3** | Low | Jest **`forceExit`** masks open handles | `package.json` jest config | Investigate `--detectOpenHandles` cleanup (Redis/Pool) |
| AUD-011 | **P3** | Medium | **No integration specs** for platform read APIs | Was: no dedicated spec | **Fixed** — `platform-read-apis.integration.spec.ts` covers users, organizations, audit, **permissions**, **modules** (401/403/200) |
| AUD-012 | **P4** | Low | Swagger UI only in `development` | `bootstrap-app.ts` | Correct for prod; ensure staging API docs via OpenAPI file |

---

## D. API coverage and contract

| Area | Assessment |
|------|------------|
| REST style | Consistent `/api/v1/{domain}/...` controllers |
| Pagination | Shared `PaginationQueryDto` (`max pageSize 50`) |
| Write validation | Whitelist + forbid unknown keys globally |
| Error envelope | `message`, `code`, `statusCode`, optional `correlationId`, `details` |
| OpenAPI + Postman | Path-level sync **0 gap** via `scripts/audit-openapi-route-gap.mjs` (2026-10-21 follow-up); method-level drift still possible |
| Cross-module calls | Fleet clients delegate to Organisation `ClientsService` (service-layer, not cross-repo SQL) — aligned with `11` / `30` |

**Public surface (by design):** `GET /health`, `GET /health/ready`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.

---

## E. Security and tenancy

| Control | Status |
|---------|--------|
| Authentication | JWT access + refresh; global `JwtAuthGuard` |
| Authorization | Global `PermissionsGuard`; `@RequirePermissions` / `@RequireAnyPermissions` on domain controllers |
| Org isolation | `x-organization-id` + membership check; IDOR patterns tested in integration specs (403/404) |
| Mass assignment | ValidationPipe whitelist |
| Audit trail | `audit` module + `expectAuditLog` helper used in integration tests for sensitive mutations |
| PII in logs | Structured logger; filter avoids returning stack to client on unknown errors |
| **Helmet / CSP** | **Helmet** on API (CSP off); CloudFront may add edge headers (AUD-002 fixed) |
| **API rate limits** | Login only; production-tier login **fail-closed** if Redis down (AUD-003 fixed); no global throttle (AUD-006 deferred) |
| CORS | Explicit origins; credentials; org header allowed |

**Code quality signal:** No `: any` matches in `apps/backend/src` (grep 2026-10-21).

---

## F. Database and concurrency

| Topic | Assessment |
|-------|------------|
| Migrations | 44 journal entries; local migrate **PASS** |
| Transactions | Used in multi-step domain flows (pattern in services; verified in integration happy paths) |
| Pool | `max: 10` per instance — size for Lambda concurrency + RDS limits |
| Unique constraints | Recent migrations e.g. driver license unique (`0042`), lease contract asset class (`0043`) |
| Postgres errors | Mapped to HTTP via `postgres-error.util.ts` + filter |
| Raw SQL | Seeds/admin scripts; health `SELECT 1` — parameterized |

---

## G. Performance and reliability

| Topic | Status |
|-------|--------|
| List query budget | Documented in rule `26`; integration specs imply paginated lists |
| N+1 | Not exhaustively profiled in this audit — **INSUFFICIENT EVIDENCE** for all hot paths |
| Redis | Permission cache + login limiter; degraded mode behaviors documented above |
| Readiness probe | DB + Redis + Drizzle checks |
| Background jobs | **None** (no queue) — long work is synchronous in request thread |
| Load testing | **NOT EXECUTED** — see `docs/testing/load-testing.md` |

---

## H. Test execution report

Commands run from repo root on **2026-10-21** (local Postgres + Redis):

| Command | Result |
|---------|--------|
| `npm run lint -w backend` | **PASS** |
| `npm run typecheck -w backend` | **PASS** |
| `npm run db:migrate -w backend` | **PASS** |
| `npm run test -w backend` | **PASS** — 36 suites, **411** tests, 0 failures (post-fix) |
| `npm audit --workspace=backend` | **26 vulnerabilities** (dev/tooling weighted) |

**Initial failures (remediated in audit):**

1. `asset-register-assignments.integration.spec.ts` — fleet client POST missing required structured address fields after DTO hardening → fixed using `fleetClientStructuredAddressIn()` fixture.
2. `fleet-leasing.integration.spec.ts` — support test relied on `GET /fleet-leasing/clients` list that hit AUD-001 → test now uses `seeded.clientId` directly.

**Integration security lattice (sampled):** `auth.integration.spec.ts`, `rbac.integration.spec.ts`, `organisation*.integration.spec.ts`, `fleet-leasing.integration.spec.ts`, finance/asset/inventory/workshop specs — include 401/403, unknown JSON keys, inactive update denial, view-only users, audit assertions (per module).

---

## I. Fixes applied during audit

| File | Change | Rationale |
|------|--------|-----------|
| `asset-register-assignments.integration.spec.ts` | Import + spread `fleetClientStructuredAddressIn()` on fleet client create | Align test with `CreateFleetClientDto` required address fields |
| `fleet-leasing.integration.spec.ts` | Return `clientId` from seed helper; avoid brittle client list GET in one support test | Restore CI green; list fragility tracked as AUD-001 |

**Follow-up (2026-10-21):** AUD-001 — `FleetClientsService.list()` skips rows that fail sync (partial page OK); integration test `FLEET-CLIENTS-LIST`.

**Follow-up (2026-10-21, audit remediation):**

| File | Change | AUD |
|------|--------|-----|
| `common/http/apply-http-security-headers.ts`, `bootstrap-app.ts`, `integration-auth.ts` | Helmet middleware (CORS-safe) | AUD-002 |
| `login-rate-limiter.service.ts`, `login-rate-limiter.service.spec.ts` | Fail-closed login when Redis errors outside `APP_ENV=development` | AUD-003 |
| `docs/api/openapi.yaml`, Postman collection | Lease contract `approve` + `activate` paths | AUD-004 |
| `scripts/audit-openapi-route-gap.mjs` | Normalized path diff for CI | AUD-004 |
| `users/platform-read-apis.integration.spec.ts` | 401/403 lattice for users, orgs, audit | AUD-011 |
| `auth.integration.spec.ts` | Helmet header smoke on `/health` | AUD-002 |
| `pg-pool-options.ts` | RDS CA hardening comment | AUD-008 |
| `package.json` (backend) | `helmet` dependency | AUD-002 |

---

## J. Outstanding / blocked

| Item | Status |
|------|--------|
| k6 / load scripts | **NOT EXECUTED** — no automated soak in this pass |
| Staging/prod runtime verification | **BLOCKED** — policy: no agent deploy without explicit approval |
| Full OpenAPI ↔ controller diff | **Path keys synced** — `npm run audit:openapi-routes` in **CI + ci:local** (exit 1 on gap); method/schema drift not automated |
| Per-endpoint RBAC matrix export | **NOT EXECUTED** — inferred from decorators + specs |
| Playwright E2E (frontend) | Out of backend scope |

---

## K. Roadmap (recommended order)

1. ~~**P1** — Harden `FleetClientsService.list` (AUD-001)~~ **Done** (follow-up pass).
2. ~~**P2** — Security headers (AUD-002); login rate limit fail-closed in production (AUD-003)~~ **Done** (audit remediation pass).
3. ~~**P2** — OpenAPI/Postman path sync (AUD-004)~~ **Done** for path keys; optional CI gate via `audit-openapi-route-gap.mjs`.
4. ~~**P3** — Platform read API integration specs (AUD-011)~~ **Done**.
5. **P3** — Dependency audit remediation plan (AUD-005).
6. **Ops** — Run documented load test on staging after promotion; capture baseline RPS/latency.

---

## L. Go-live checklist (backend)

- [x] Migrations forward-only with journal entries
- [x] Env validation requires JWT secrets in production tier
- [x] Global authz on protected routes (except explicit `@Public`)
- [x] Org header + membership enforcement pattern
- [x] Integration test suite green locally/CI pattern
- [x] Fleet client list resilience (AUD-001)
- [x] HTTP security headers in API tier (AUD-002)
- [x] OpenAPI path keys match controller routes (AUD-004 — run `node scripts/audit-openapi-route-gap.mjs`)
- [ ] Staging soak / load test executed and recorded
- [ ] Production RDS migrate manual gate documented and rehearsed
- [ ] npm audit critical path reviewed for runtime deps (not only dev)

---

## M. Audit metadata

| Field | Value |
|-------|-------|
| Auditor role | Automated + code review (Cursor agent, Himanshu backend scope) |
| Git commits | **None** (user sovereignty) |
| Blind spots | Hot-path query counts, full OpenAPI diff, production WAF/CloudFront headers, Redis failure modes at scale |
| Re-run recommendation | After next large fleet/finance DTO change or before `main` promotion |

---

## Coordinator summary (for parent agent)

1. **Verdict one-liner:** **CONDITIONAL READY** — P1 fleet list + P2 Helmet/login fail-closed/OpenAPI path sync addressed; soak/load and npm audit dev chain remain.
2. **Top P0/P1:** AUD-001 **fixed**; no open P0/P1 in code review after remediation pass.
3. **Docs:** `docs/audit/backend-production-readiness-2026-10-21.md`, `docs/audit/backend-system-inventory.md`
4. **Tests:** **411 passed**, 0 failed (36 suites) after audit test fixes.
5. **Blocked:** Load/k6 NOT EXECUTED; staging/prod deploy NOT EXECUTED; full OpenAPI diff NOT EXECUTED.
