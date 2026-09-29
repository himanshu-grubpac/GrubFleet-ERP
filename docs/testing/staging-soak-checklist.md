# Staging soak checklist (Organisation + Auth)

Manual pass after promote to **staging** (GHA migrate + deploy). No automated substitute for this checklist yet.

## Environment

- [ ] Portal URL loads (CloudFront staging tier from `docs/deployment/environments.md`).
- [ ] API health: `GET /api/v1/health` → `ok`; `GET /api/v1/health/ready` → database + redis up.

## Auth boot

- [ ] Cold load: login skeleton only until session hydrates; no AppShell flash when logged out.
- [ ] Login admin → dashboard; logout → login page without stale header.
- [ ] Wrong password shows inline error; no navigation.

## RBAC

- [ ] Viewer (or role with `organisation.view` only): lists load; create/edit/deactivate hidden or 403 on API.
- [ ] Change role permissions in Administration → assignee’s `/auth/me` (or refocus portal) picks up new keys within ~10s.
- [ ] Cross-check: user without `organisation.update` cannot PATCH employee/location (403).

## Organisation — Locations

- [ ] Paginated list, search, type filter (types from catalog endpoint, not list payload).
- [ ] Create IN address with valid pincode; view + copy icons match display formatters.
- [ ] Deactivate with reason → inactive in list; activate confirm modal.
- [ ] Edit active location; 400 on invalid postal for country.

## Organisation — Employees

- [ ] Paginated list, department filter, search.
- [ ] Create employee on branch location; view page fields match API.
- [ ] Deactivate with reason (modal); activate confirm.

## Regression spot-checks

- [ ] Administration roles list loads for admin viewer.
- [ ] Fleet module shell still reachable for admin (no org change regression).

## Notes

Record date, tester, and any defects in your issue tracker. Deferred product gaps remain in `.project-tracking/REQUIREMENTS_GAPS.local.md`.
