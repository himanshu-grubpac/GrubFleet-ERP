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

## Headers

- Request: `X-Correlation-Id` (optional; server generates if missing)
- Response: same header echoed
- Auth (planned): `Authorization: Bearer <access_token>`

## Documentation

Swagger UI: `/api/v1/docs` when the backend is running.

## Pagination (future)

`?page=&limit=` with `{ data, meta: { page, limit, total } }` — not used in foundation endpoints.
