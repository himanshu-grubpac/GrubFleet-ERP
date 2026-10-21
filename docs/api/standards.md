# API standards

## Base URL

`/api/v1` (configurable via `API_PREFIX`).

## Versioning

Path prefix `v1`. Breaking changes require a new prefix or explicit deprecation headers.

## Errors

JSON body:

```json
{
  "message": "Human-readable summary",
  "code": "VALIDATION_ERROR",
  "statusCode": 422,
  "correlationId": "uuid",
  "details": {}
}
```

Clients should log `correlationId` when reporting issues.

### Common `code` values

| Code | Typical HTTP | Meaning |
|------|--------------|---------|
| `VALIDATION_ERROR` | 400 | DTO / ValidationPipe failure; see optional `details.errors[]` with `field` + `message` |
| `BAD_REQUEST` | 400 | Generic client error from services |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Resource missing (including some invalid FK references) |
| `CONFLICT` | 409 | Business conflict (Nest default for `ConflictException` without custom `code`) |
| `UNIQUE_VIOLATION` | 409 | Unhandled Postgres unique constraint (generic) |
| `DRIVER_LICENSE_DUPLICATE` | 409 | Organisation driver licence already in org |
| `DRIVER_CPR_DUPLICATE` | 409 | Organisation driver CPR already in org |
| `VEHICLE_REGISTRATION_DUPLICATE` | 409 | Asset register vehicle registration already in org |
| `ROLE_NAME_CONFLICT` | 409 | Role name duplicate in org |
| `LOCATION_TYPE_NAME_DUPLICATE` | 409 | Organisation location type name duplicate |
| `ASSET_CLASS_NAME_DUPLICATE` | 409 | Asset class name duplicate in org |
| `INVENTORY_PART_NAME_DUPLICATE` | 409 | Finance/inventory catalog part name duplicate |
| `LEASE_CONTRACT_NUMBER_DUPLICATE` | 409 | Lease contract number duplicate |
| `WORKSHOP_AMC_SUBSCRIBER_DUPLICATE` | 409 | Vehicle already on AMC tier |
| `REFERENCE_NOT_FOUND` | 404 | FK target row does not exist |
| `REFERENCE_VIOLATION` | 409 | FK blocks delete/update because dependents exist |
| `FOREIGN_KEY_VIOLATION` | 400 | Other FK constraint failures |
| `INTERNAL_ERROR` | 500 | Unmapped server failure (no stack or schema in body) |

### Examples

Validation (400):

```json
{
  "message": "licenseNumber must contain at least one digit, property hackField should not exist",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "correlationId": "…",
  "details": {
    "errors": [
      { "field": "licenseNumber", "message": "licenseNumber must contain at least one digit" },
      { "field": "hackField", "message": "property hackField should not exist" }
    ]
  }
}
```

Unique constraint (409):

```json
{
  "message": "A driver with this license number already exists in the organisation",
  "code": "DRIVER_LICENSE_DUPLICATE",
  "statusCode": 409,
  "correlationId": "…"
}
```

Unknown server error (500):

```json
{
  "message": "Something went wrong",
  "code": "INTERNAL_ERROR",
  "statusCode": 500,
  "correlationId": "…"
}
```

## Headers

- Request: `X-Correlation-Id` (optional; server generates if missing)
- Response: same header echoed
- Auth (planned): `Authorization: Bearer <access_token>`

## Documentation

Swagger UI: `/api/v1/docs` when the backend is running.

## Pagination (future)

`?page=&limit=` with `{ data, meta: { page, limit, total } }` — not used in foundation endpoints.
