# ERP modules (roadmap)

Foundation scaffolds only — no business logic yet.

| Module | Backend folder | Frontend route |
|--------|----------------|----------------|
| Auth | `modules/auth` | `/login` |
| Users | `modules/users` | (settings, TBD) |
| Organizations | `modules/organizations` | `/organization` |
| Roles / permissions | `modules/roles`, `modules/permissions` | `/roles-permissions` |
| Audit | `modules/audit` | TBD |
| Fleet & leasing | TBD | `/fleet-leasing` |
| Assets | TBD | `/asset-management` |
| Workshop | TBD | `/workshop` |
| Inventory | TBD | `/inventory` |
| Procurement | TBD | `/procurement` |
| Finance | TBD | `/finance` |

Add Nest modules under `apps/backend/src/modules/<name>/` and mirror routes in the frontend sidebar config.
