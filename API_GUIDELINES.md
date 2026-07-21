# API Guidelines

Conventions for TrustNet's REST API. For the full endpoint list see [docs/ENDPOINTS.md](docs/ENDPOINTS.md) and per-module docs in [docs/modules/](docs/modules/). For Postman usage see [docs/POSTMAN_GUIDE.md](docs/POSTMAN_GUIDE.md). Live spec at `/api/docs` (Swagger UI, see `Main/server/src/docs/swagger.js`).

## Base URL

All routes are versioned and mounted under:

```
/api/v1
```

Health check lives outside versioning at `GET /health`.

## Response envelope

Success:

```json
{ "success": true, "data": { } }
```

Error (from `errorHandler` middleware and `ApiError`):

```json
{ "success": false, "message": "string", "details": { }, "stack": "dev only" }
```

`ApiError(statusCode, message, details)` (`Main/server/src/utils/ApiError.js`) is the standard way controllers/services raise domain errors.

## Auth

- Bearer token: `Authorization: Bearer <accessToken>` header.
- Refresh token: `trustnet_refresh` httpOnly cookie, used by `POST /api/v1/auth/refresh`.
- `authenticate` middleware (`src/middlewares/auth.js`) sets `req.user = { id, email }`.
- `authorize(...roles)` middleware gates role-restricted routes (e.g. admin).
- `requireApprovedVerification` gates routes needing KYC-approved status (currently only `/dashboard`).

Full flow: [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md).

## Validation

Joi schemas in `src/validators/`, applied via `validate(schema)` middleware on `req.body`. All schemas use `.unknown(true)`. Not every write route has a validator yet — see [BACKLOG.md](BACKLOG.md) (Phase 4 gap: startup/community/post/collaboration validators incomplete per roadmap plan).

## Pagination

List endpoints are pageable but response shape for pagination metadata is inconsistent across modules today. TODO: standardize on `{ data, total, page, pageSize }` (tracked in [ROADMAP.md](ROADMAP.md) Phase 5) — do not assume a single pagination contract until that lands.

## Ownership & ACLs

Mutation routes (update/delete on startups, communities, posts, teams) verify the requester is the resource owner (or admin, where implemented). Ownership checks live in services, not controllers.

## File uploads

`multer` handles multipart uploads (avatar, verification documents); files are pushed to Cloudinary via `cloudinary.service.js`. Endpoints: `POST /api/v1/profile/avatar`, `POST /api/v1/verification/documents/:type`.

## Rate limiting & CORS

No rate limiting middleware exists yet (flagged in [SECURITY.md](SECURITY.md) and [ROADMAP.md](ROADMAP.md) Phase 1). CORS origin is `CLIENT_URL` env var or `*` fallback — lock this down before production (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Error codes in use

| Status | Meaning |
|---|---|
| 400 | Validation failure (Joi) |
| 401 | Missing/invalid auth token |
| 403 | Authenticated but not authorized (role, ownership, verification gate) |
| 404 | Resource or route not found |
| 500 | Unhandled server error |

## Adding a new endpoint

1. Define Joi schema in `src/validators/` if the route accepts a body.
2. Add route in `src/routes/<module>.routes.js`, wire `authenticate`/`authorize`/`validate` as needed.
3. Add controller fn in `src/controllers/`.
4. Add service fn in `src/services/`.
5. Add `@openapi` JSDoc block above the route for Swagger.
6. Update the relevant [docs/modules/](docs/modules/) doc and [docs/ENDPOINTS.md](docs/ENDPOINTS.md).
7. Follow [CONTRIBUTING.md](CONTRIBUTING.md) branch/PR process.
