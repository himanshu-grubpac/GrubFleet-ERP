# GrubFleet dashboard — what the reference shows and what we use

The reference is a **Dashtail admin template** (11 screenshots). It has three demo dashboards: **Analytics**, **Ecommerce**, and **Project**. We only copy the **idea**: cards, charts, tables, tabs, and spacing. We use **GrubFleet colours and sidebar**, and **real ERP numbers** from our modules — not website analytics or fake demo data.

**Today:** `/dashboard/` is empty. The rest of the portal (sidebar, modules) already works.

---

## What the reference always shows (shell)

| Reference | On GrubFleet |
|-----------|----------------|
| Left menu: Analytics / Ecommerce / Project | **Do not add this.** Keep the normal ERP sidebar (Fleet, Organisation, Finance, etc.). |
| Purple theme, “Dashtail” name | **Fleet Pulse** + our portal UI kit. |
| “Storage 40% — Upgrade” card in sidebar | **Remove** (not our product). |
| Top bar: search, language, theme, alerts, profile | Same **header pattern** we already use; counts only when API exists. |
| Footer / floating settings gear | Optional footer; settings → Administration if user has access. |

Inside the dashboard page only, use **3 tabs** (names below). That replaces the template’s three sidebar links.

---

## Tab 1 — Operations  
*(from template **Analytics** screens)*

**What the template shows:** summary pills, big trend chart, “users in last 30 minutes”, four small KPI tiles, two donut charts, map with country list, “top referrals” list, and a table of top pages with pagination.

**What we show instead:**

| Template idea | GrubFleet content | Where data comes from |
|---------------|-------------------|------------------------|
| Snapshot + date range | Fleet & org summary for chosen period | Dashboard API or module counts |
| Coloured count pills | Active leases · Allocated vehicles · Open support cases · New clients in period | Fleet, assets, support, Organisation |
| Big area chart | Monthly trend: utilisation or billing | Finance + fleet |
| “Live users” + mini bars | Pick one at sign-off: active portal users **or** vehicles active today | Auth / fleet register |
| Side list next to chart | Top locations or states by asset count | Locations + asset register |
| Four KPI tiles (sessions, page views, etc.) | Open work orders · Pending invoices · Lease allocation % · Compliance overdue % | Workshop, Finance, Fleet, compliance |
| Donut: new vs returning | Lease status mix (active / draft / pending termination) | Lease contracts |
| Donut: devices | Fleet mix by vehicle class (2W / 3W / 4W / other) | Asset register |
| Map + ranked countries | Clients or assets by region (state list OK if no map yet) | Addresses (geo rules) |
| Top referrals (social links) | Top clients by contract value or vehicle count | Clients + contracts |
| Top pages table | Recent important records: lease, invoice, work order — with **View** to detail | Lists / one “recent items” API |
| Select date / See all | Date filter + jump to filtered module list | Deep links |

**Do not use:** page views, bounce rate, browser stats, social referral URLs.

---

## Tab 2 — Commercial  
*(from template **Ecommerce** screens)*

**What the template shows:** four money/order KPI cards, stacked revenue chart, browser donut, best-selling products list, top customers (podium + list), visitor area chart, customer gender donut, payment list, invoice table, map, popular products.

**What we show instead:**

| Template idea | GrubFleet content | Where data comes from |
|---------------|-------------------|------------------------|
| Total sales | Month-to-date billing (lease + invoices) | Finance |
| Today’s orders | Invoices today + contracts activated today | Finance + Fleet |
| Completed / pending orders | Paid vs pending (invoices or vendor payments) | Finance |
| Stacked bar chart | Billed vs maintenance cost vs credits | Finance + workshop |
| Browser donut | **Revenue by type** (lease / parts / AMC / other) | Finance |
| Top sell list | Top billed items or top parts issued | Finance / inventory |
| Top customers podium + list | Top fleet clients; bars = credit used % or fleet allocated % | Clients + finance |
| Visitor area chart | Support/replacement requests or work orders opened over time | Support + workshop |
| Customer donut | Client segment or invoice type split (only if product defines it) | Organisation / finance |
| Transaction list | Recent receipts and vendor payments | Finance |
| Orders table | Recent invoices with Paid / Pending / Overdue | Finance |
| Map “top countries” | Depots/locations with asset or client counts | Locations |
| Popular products | Fast-moving parts or short low-stock list | Inventory |

**Do not use:** browser share, fake product URLs, generic “orders” without finance meaning.

---

## Tab 3 — Workshop & tasks  
*(from template **Project** screens)*

**What the template shows:** welcome banner with task counts, four project stat cards, multi-line trend chart, calendar and notes, workload bars per person, budget gauge, overdue task table, budget bar chart, Gantt-style timeline, upcoming deadlines with progress bars, activity feed, top contributor leaderboard.

**What we show instead:**

| Template idea | GrubFleet content | Where data comes from |
|---------------|-------------------|------------------------|
| Welcome + today / overdue tasks | Hello {user} + counts: due today vs overdue (compliance, WOs, approvals) | RBAC-scoped counts |
| Four stat cards | Open work orders · Completed (period) · In progress · Active AMC | Workshop |
| Line chart (overdue / in progress / done) | Work orders + compliance trend by month | Workshop + compliance |
| Calendar + upcoming meetings | AMC visits, insurance/lease end dates — link to module | Asset, fleet, workshop |
| Workload bars | Technician or location load (% open WOs) — when assignment API exists | Workshop |
| Budget gauge + bar charts | Maintenance spend vs budget by month | Finance + workshop |
| Overdue table | Overdue compliance + overdue WOs (who, what, deadline, days late) | Compliance + workshop |
| Gantt strip | Simple timeline: work order stages or allocation phases (not “coding/design”) | Workshop / fleet |
| Upcoming deadlines list | Renewals due with “days left” bar | Compliance + fleet |
| Recent activity | Short audit-style feed (activate, allocate, invoice, close WO) — no sensitive PII | Audit logs |
| Top contributor | **Skip leaderboard** unless product asks — use “sites needing attention” instead | Locations + issues |
| Deployment timeline strip | Optional: contract lifecycle (draft → active → termination) | Fleet |

---

## One page structure

```text
/dashboard/
  Operations    → fleet, locations, compliance snapshot
  Commercial    → money, clients, invoices, parts
  Workshop & tasks → WOs, AMC, overdue, calendar, activity
```

Every widget: title, optional date range, loading/empty/error, **See all** → real list page.

**Rules when we build:** live API only (no mock KPIs on production); links into existing modules; Phase 1 can be layout + a few real counts; Phase 2 fills charts when backend aggregates exist.

---

## Skip entirely (from reference)

- Website analytics (sessions, bounce, referrals, browsers).
- Demo names, lorem text, fake storage upsell.
- A second sidebar that repeats Analytics / Ecommerce / Project.
- KPI tiles on other module home pages — **only** on this dashboard unless product says otherwise.

---

## Who does what

| Work | Owner |
|------|--------|
| Tabs, cards, charts UI, empty states | Khushi (frontend, portal theme) |
| Counts and aggregate APIs, tenant-safe | Himanshu (backend) |
| “View” / “See all” links | Frontend → existing routes |

**Code today:** `apps/frontend/src/app/(dashboard)/dashboard/page.tsx` (empty), nav in `sidebar.tsx` + `lib/navigation/modules.ts`.
