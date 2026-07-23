# Architecture

System architecture of TrustNet backend (`Main/server`). For frontend structure see [README.md](README.md). For endpoint-level detail see [API_GUIDELINES.md](API_GUIDELINES.md) and [docs/ENDPOINTS.md](docs/ENDPOINTS.md). For schema detail see [DATABASE.md](DATABASE.md).

## Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js (CommonJS) | — |
| Framework | Express | 5.2.1 |
| Database | MongoDB via Mongoose | 9.7.3 |
| Auth | JWT (access + refresh) + Google/LinkedIn OAuth | jsonwebtoken 9.0.3 |
| 2FA | TOTP | speakeasy 2.0.0, qrcode 1.5.4 |
| Validation | Joi | 18.2.3 |
| File storage | Cloudinary | 2.10.0 |
| Uploads | Multer | 2.2.0 |
| Email | Nodemailer | 9.0.3 |
| Security headers | Helmet | 8.2.0 |
| Compression | compression | 1.8.1 |
| Logging | Morgan | 1.11.0 |
| API docs | swagger-jsdoc + swagger-ui-express | — |
| Frontend | React + Vite + Tailwind | — |

## Pattern

MVC + Service layer:

```
routes/      -> maps HTTP verb+path to controller fn, mounts middleware (auth, validate)
controllers/ -> parses req, calls service, shapes response
services/    -> business logic, DB queries via Mongoose models
models/      -> Mongoose schemas
validators/  -> Joi schemas used by validate middleware
middlewares/ -> cross-cutting concerns (auth, error handling, security)
```

No repository layer exists despite root [README.md](README.md) mentioning one — services call Mongoose models directly. TODO: confirm whether a repository layer is planned (see [ROADMAP.md](ROADMAP.md) Phase 3).

## Directory layout

```
Main/server/
  server.js          entry point, connects DB, starts listener
  app.js             Express app, middleware stack, route mounting
  src/
    config/          database.js, env.js, jwt.js, oauth.js
    constants/       (empty placeholder)
    controllers/      16 controllers
    docs/            swagger.js
    middlewares/      auth, authorize, cors, compression, helmet, logger, errorHandler, notFound, validate, verification
    models/           11 Mongoose models
    routes/           17 route files, aggregated in index.js
    services/         19 service files
    utils/            ApiError, asyncHandler
    validators/       7 Joi validator files
  test/               placeholder only, no test suite
  scripts/
```

## Request lifecycle

`server.js` loads env, connects Mongo (`connectDB`, 10s server selection timeout), then starts `app.js` listener on `PORT` (default 5000).

Middleware order in `app.js`:

1. `helmetMiddleware` — security headers
2. `corsMiddleware` — CORS (origin = `CLIENT_URL` or `*`)
3. CORS preflight handler
4. `compressionMiddleware` — gzip
5. `express.json()` — body parsing
6. `sanitizeRequest` — strips leading `$`/dot-notation from body/query/param keys (NoSQL operator injection) and raw HTML tags from string values, in place for `req.query` (a getter-only accessor under Express 5). Adopted from a merge with an independently-developed backend (Developer 1); see [BACKLOG.md](BACKLOG.md).
7. `cookieParser()`
8. `morgan('dev')` — request logging
9. `healthRoutes` at `/health`
10. Swagger UI at `/api/docs`
11. `defaultLimiter` — global per-IP/user rate limit (100 req/15min), plus stricter per-route limiters on `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/resend-verification`, `/search`, `/ai/insights` (`src/middlewares/rateLimiter.js`, also adopted from the Developer 1 merge). Closes the "no rate limiting middleware yet" gap below.
12. `apiRoutes` at `/api/v1` (see [API_GUIDELINES.md](API_GUIDELINES.md))
13. `notFound` — 404 fallback
14. `errorHandler` — centralized error response

Per-route middleware: `authenticate` (JWT check), `authorize(...roles)` (RBAC), `validate(schema)` (Joi body validation), `requireApprovedVerification` (gates dashboard on KYC approval).

## Module map

Each backend module below has its own doc in [docs/modules/](docs/modules/):

| Module | Routes prefix | Doc |
|---|---|---|
| Auth | `/api/v1/auth` | [docs/modules/auth.md](docs/modules/auth.md) |
| Users | `/api/v1/users` | [docs/modules/users.md](docs/modules/users.md) |
| Profile | `/api/v1/profile` | [docs/modules/profile.md](docs/modules/profile.md) |
| Startups | `/api/v1/startups` | [docs/modules/startups.md](docs/modules/startups.md) |
| Communities | `/api/v1/communities` | [docs/modules/communities.md](docs/modules/communities.md) |
| Posts & Interactions | `/api/v1/posts` | [docs/modules/posts.md](docs/modules/posts.md) |
| Teams | `/api/v1/teams` | [docs/modules/teams.md](docs/modules/teams.md) |
| Workspaces | `/api/v1/workspaces` | [docs/modules/workspace.md](docs/modules/workspace.md) |
| Projects | `/api/v1/projects` | [docs/modules/projects.md](docs/modules/projects.md) |
| Tasks | `/api/v1/tasks` | [docs/modules/tasks.md](docs/modules/tasks.md) |
| Milestones | `/api/v1/milestones` | [docs/modules/milestones.md](docs/modules/milestones.md) |
| Documents | `/api/v1/documents` | [docs/modules/documents.md](docs/modules/documents.md) |
| Hiring | `/api/v1/jobs` | [docs/modules/hiring.md](docs/modules/hiring.md) |
| Applications | `/api/v1/applications` | [docs/modules/applications.md](docs/modules/applications.md) |
| Investors | `/api/v1/investors`, `/api/v1/investment-interests` | [docs/modules/investors.md](docs/modules/investors.md) |
| Funding | `/api/v1/funding-rounds`, `/api/v1/funding-contributions` | [docs/modules/funding.md](docs/modules/funding.md) |
| Marketplace | `/api/v1/provider-profiles`, `/api/v1/service-listings`, `/api/v1/engagement-requests` | [docs/modules/marketplace.md](docs/modules/marketplace.md) |
| Analytics | `/api/v1/analytics` | [docs/modules/analytics.md](docs/modules/analytics.md) |
| Reports | `/api/v1/reports` | [docs/modules/reports.md](docs/modules/reports.md) |
| AI | `/api/v1/ai` | [docs/modules/ai.md](docs/modules/ai.md) |
| Collaborations | `/api/v1/collaborations` | [docs/modules/collaborations.md](docs/modules/collaborations.md) |
| Messages | `/api/v1/messages` | [docs/modules/messages.md](docs/modules/messages.md) |
| Notifications | `/api/v1/notifications` | [docs/modules/notifications.md](docs/modules/notifications.md) |
| Settings | `/api/v1/settings` | [docs/modules/settings.md](docs/modules/settings.md) |
| Search | `/api/v1/search` | [docs/modules/search.md](docs/modules/search.md) |
| Recommendations | `/api/v1/recommendations` | [docs/modules/recommendations.md](docs/modules/recommendations.md) |
| Verification | `/api/v1/verification` | [docs/modules/verification.md](docs/modules/verification.md) |
| Admin | `/api/v1/admin` | [docs/modules/admin.md](docs/modules/admin.md) |
| Dashboard | `/api/v1/dashboard` | [docs/modules/dashboard.md](docs/modules/dashboard.md) |

## Known architectural gaps

Tracked in [ROADMAP.md](ROADMAP.md) / [BACKLOG.md](BACKLOG.md):

- No repository layer (services hit Mongoose models directly) despite README claim.
- No automated test suite (`test/` is a placeholder, `npm test` echoes a message).
- No CI/CD configuration found in repo.
- ~~No rate limiting middleware yet.~~ Resolved via the Developer 1 merge — see Request lifecycle above.
- Auth middleware bug: refresh-token verification path reportedly uses the access secret instead of refresh secret (see [SECURITY.md](SECURITY.md)).

TODO: add sequence diagrams for auth flow once flow is stabilized (see [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md)).
