# TrustNet Backend — Stabilization & Feature Roadmap (Phased Implementation Plan)

**Source:** Derived from `.kilo/plans/1784096125148-backend-stabilization-backlog.md` (the stabilization backlog).
**Target repo:** `haricodes2970/TrustNet` · branch `main`
**Cadence:** One phase = one feature branch + one PR to `main`. Phases are dependency-ordered; later phases assume earlier ones are merged.
**Allowed change window:** Backend only (`Main/server/`). Frontend coordination points are called out per phase.

---

## Phase Summary

| # | Theme | Risk | Branch |
|---|-------|------|--------|
| 1 | Critical Security & Stability Fixes | Medium | `stabilize/phase-1-security-fixes` |
| 2 | AuthN/AuthZ Foundation: RBAC + Admin + Verification Approval | High | `feat/phase-2-admin-rbac` |
| 3 | Code Quality & Consistency Refactor | Medium | `refactor/phase-3-code-quality` |
| 4 | Validation, Ownership & Data Integrity | Medium | `feat/phase-4-validation-ownership` |
| 5 | Scalability & Performance | Medium | `perf/phase-5-scalability` |
| 6 | Missing Features, Docs & Developer Experience | Low–Medium | `feat/phase-6-features-dx` |

Backlog → phase traceability is in the appendix.

---

## Phase 1 — Critical Security & Stability Fixes

- **Objective:** Eliminate production-blocking defects (token verification, secrets hygiene, hardcoded DNS) and add baseline abuse protection (rate limiting, CORS lockdown, password policy).
- **Business reason:** Refresh-cookie sessions currently fail, live secrets risk account takeover / DB breach, and unthrottled auth endpoints are brute-forceable. These block any safe launch.
- **Technical reason:** `authenticate` (`src/middlewares/auth.js`) verifies refresh tokens with `accessSecret`; `.env` handling needs hardening; `server.js` forces external DNS via `dns.setServers`; no rate limiter; CORS falls back to `*`; register/reset accept weak passwords.
- **Files affected:**
  - `src/middlewares/auth.js` (token-type-aware verification)
  - `Main/server/server.js` (remove DNS override)
  - `src/middlewares/cors.js` (reject unknown origins)
  - `src/middlewares/rateLimit.js` (new)
  - `src/routes/auth.routes.js` (wire limiter + validators)
  - `src/validators/auth.validators.js` (new: register / reset / change-password)
  - `src/config/env.js` (validate `TWO_FACTOR_ENCRYPTION_KEY`)
  - `.env.example` (new), `.gitignore` (confirm `.env` excluded)
- **Testing strategy:** Unit tests for `authenticate` (access-header + refresh-cookie paths); CORS origin matrix; rate-limit counter/threshold; integration tests for register/login/forgot-password with weak vs strong passwords; CI secret scan (gitleaks) confirming `.env` is untracked.
- **Definition of Done:** Refresh-cookie requests pass `authenticate`; `.env` absent from git and `.env.example` committed; no `dns.setServers`; rate limiter active on `/auth/*`; CORS rejects unknown origins; password policy enforced on register/reset/change.
- **Git branch name:** `stabilize/phase-1-security-fixes`
- **Commit naming convention:** Conventional Commits — `fix(security):`, `chore(config):`, `test:`.
- **Deployment impact:** Operational prerequisite = rotate JWT / Cloudinary / SMTP / OAuth secrets before deploy. New recommended env var `TWO_FACTOR_ENCRYPTION_KEY`. No DB change. Zero-downtime.
- **Rollback strategy:** `git revert` individual commits. Rate limiter behind `RATE_LIMIT_ENABLED` env flag. No DB migration to revert.
- **Risk level:** Medium (token-handling behavior change + required secret rotation).

---

## Phase 2 — AuthN/AuthZ Foundation: RBAC + Admin + Verification Approval

- **Objective:** Introduce role-based access control and a working admin module that can approve/reject verifications and moderate users/content.
- **Business reason:** The product overview promises an admin moderation dashboard. Without it, verification submissions dead-end (`status` can reach `pending` but never `approved`) and there is no trusted gatekeeper.
- **Technical reason:** `User.role` enum exists but no `authorize` middleware; no admin routes/service; verification has no approver actor; mutation routes (`startup/community/post/collaboration`) are unauthenticated.
- **Files affected:**
  - `src/middlewares/authorize.js` (new: `requireRole(...roles)`)
  - `src/services/adminService.js` (new), `src/controllers/adminController.js` (new), `src/routes/admin.routes.js` (new)
  - `src/routes/index.js` (mount `/admin`)
  - `src/routes/startup.routes.js`, `community.routes.js`, `post.routes.js`, `collaboration.routes.js` (add `authenticate`)
  - `src/controllers/verificationController.js` (approve/reject hooks)
  - `src/models/User.js` (first-admin seeding path)
- **Testing strategy:** Unit `authorize` (role allow/deny); integration admin endpoints with admin vs non-admin tokens; verification approve → `approved` + `isVerified`; reject → `rejected` + reason; non-admin blocked from `/admin`; previously-public write routes now reject anonymous.
- **Definition of Done:** `authorize(role)` guard exists; admin user/list/role/ban + verification review endpoints functional; all mutation routes require `authenticate`; repeatable first-admin bootstrap documented.
- **Git branch name:** `feat/phase-2-admin-rbac`
- **Commit naming convention:** `feat(admin):`, `feat(auth):`, `refactor(routes):`.
- **Deployment impact:** New `/api/v1/admin` surface behind auth. **Breaking for frontend:** routes that were public now require a bearer token — must ship with the client update. First-admin bootstrap is an operational step.
- **Rollback strategy:** Admin routes behind a route-level flag; if frontend not ready, keep write-route `authenticate` behind `ENFORCE_AUTH` flag. No schema migration (fields already exist).
- **Risk level:** High (changes auth surface, requires client coordination + role seeding).

---

## Phase 3 — Code Quality & Consistency Refactor

- **Objective:** Extract auth handlers into a controller, standardize error handling, remove dead/duplicate code, and centralize DTO mapping.
- **Business reason:** Reduces defect rate, merge conflicts, and onboarding cost; makes the codebase testable ahead of feature work.
- **Technical reason:** `auth.routes.js` is 676 lines of inline handlers; controllers mix direct `res.json` with `next(err)`; `queryUtils.js` duplicates `serviceUtils.js`; `resolveUser`/`toUserResponse`/`mapProfileInput` are duplicated; five empty `index.js` barrels.
- **Files affected:**
  - `src/controllers/authController.js` (new), `src/routes/auth.routes.js` (thin wiring)
  - All controllers (standardize on `next(err)` + `ApiError`)
  - `src/services/queryUtils.js` (delete)
  - `src/utils/response.js` (new envelope helper), `src/utils/userDto.js` (new DTO)
  - Empty `index.js` barrels (remove or populate)
- **Testing strategy:** Auth-flow regression suite; assert uniform error envelope `{ success, message, ... }`; contract tests for auth responses (no snapshot fragility).
- **Definition of Done:** No business logic in route files; uniform error envelope; no duplicate utilities; DTO mapping centralized; auth flows green in CI.
- **Git branch name:** `refactor/phase-3-code-quality`
- **Commit naming convention:** `refactor(auth):`, `refactor(controllers):`, `chore(deps):`, `test:`.
- **Deployment impact:** None (internal restructure, identical external behavior).
- **Rollback strategy:** `git revert` to a pre-phase tag; no DB/schema change.
- **Risk level:** Medium (large diff; mitigated by comprehensive tests).

---

## Phase 4 — Validation, Ownership & Data Integrity

- **Objective:** Enforce input validation on all modules and ownership on mutations; stop silent user auto-creation.
- **Business reason:** Prevents corrupt/oversized data, unauthorized edits to others' startups/communities/posts, and phantom user documents polluting the users collection.
- **Technical reason:** Only 4 validator files exist; startup/community mutations have no owner check; `resolveUser` creates a MongoDB user on first request in 4 places.
- **Files affected:**
  - `src/validators/startup.validators.js`, `community.validators.js`, `post.validators.js`, `collaboration.validators.js` (new)
  - `src/routes/*` (wire `validate(schema)`)
  - `src/services/startupService.js`, `communityService.js`, `postService.js`, `collaborationService.js` (ownership guard)
  - `src/services/interactionService.js`, `dashboardService.js`, `src/controllers/profileController.js`, `settingsController.js` (resolve `resolveUser` policy)
- **Testing strategy:** Negative/fuzz validation per module; ownership tests (non-owner update/delete → 403); `resolveUser` policy test (404 vs create per decided policy); invalid payloads → 400 with field errors.
- **Definition of Done:** Every write route validated; resource mutations enforce owner-or-admin; no unplanned user creation; invalid bodies return structured 400.
- **Git branch name:** `feat/phase-4-validation-ownership`
- **Commit naming convention:** `feat(validation):`, `fix(authz):`, `refactor(services):`.
- **Deployment impact:** **Breaking for non-conforming clients** — bodies must match schemas. Coordinate with frontend. No DB migration.
- **Rollback strategy:** Validation can be relaxed via `STRICT_VALIDATION=false`; ownership guard behind `ENFORCE_OWNERSHIP` flag.
- **Risk level:** Medium.

---

## Phase 5 — Scalability & Performance

- **Objective:** Remove N+1/redundant queries, add pagination, leverage text indexes, and optimize external-service clients.
- **Business reason:** Keeps response times and infra cost acceptable as data grows; enables real pagination UX.
- **Technical reason:** `getUnreadCount` loads all conversations then counts messages (N+1); per-request user lookups in message/notification controllers; list endpoints return unbounded arrays; `searchService` uses regex without the existing text indexes; email/cloudinary clients built per call.
- **Files affected:**
  - `src/services/messageService.js`, `notificationService.js`, `dashboardService.js`, `searchService.js`
  - `src/services/email.service.js` (singleton transport), `src/services/cloudinary.service.js` (lazy factory)
  - `src/services/serviceUtils.js` (pagination helper)
  - `src/models/User.js`, `Community.js` (indexes)
  - `src/services/cleanupService.js` (new: notification/message retention)
- **Testing strategy:** Load tests (k6/artillery) on messages/notifications/list endpoints; pagination metadata assertions; `explain()` confirming text-index usage in search.
- **Definition of Done:** List endpoints return `{ data, total, page, pageSize }`; no N+1 in message/notification paths; search uses text index; transports are singletons; retention job/DB TTL in place.
- **Git branch name:** `perf/phase-5-scalability`
- **Commit naming convention:** `perf(messages):`, `perf(search):`, `chore(config):`.
- **Deployment impact:** Online DB index creation (no downtime). Optional retention cron. Response envelope extended (additive).
- **Rollback strategy:** Revert commits; indexes may remain (harmless) or be dropped; no data loss.
- **Risk level:** Medium.

---

## Phase 6 — Missing Features, Docs & Developer Experience

- **Objective:** Deliver promised features (sessions, uploads, membership, follow, email notifications) and establish tests/CI/lint/docs.
- **Business reason:** Completes the product described in the overview and raises engineering throughput/quality.
- **Technical reason:** Session/TODO placeholders; no post/image upload handlers; no community membership or follow endpoints; no email notifications; incomplete Swagger; no tests/CI/lint.
- **Files affected:**
  - `src/models/Session.js` (new) or Redis store + `src/services/sessionService.js`
  - `src/routes/post.routes.js`, `message.routes.js` (upload handlers)
  - `src/routes/community.routes.js` (join/leave/members), `src/routes/connection.routes.js` (new: follow)
  - `src/services/email.service.js` (notification emails per preference)
  - All `src/routes/*.js` (Swagger `@openapi` blocks), `README.md`, `.eslintrc`/`.prettierrc`, `.github/workflows/ci.yml`, `test/`
- **Testing strategy:** E2E flows for sessions/upload/membership/follow/notifications; CI runs lint+tests on every PR; Swagger rendered and schema-validated.
- **Definition of Done:** Sessions list/revoke works; uploads return URLs; join/leave + follow function; email notifications sent per preference; CI green; Swagger covers all routes; README accurate.
- **Git branch name:** `feat/phase-6-features-dx`
- **Commit naming convention:** `feat(...):`, `docs(...):`, `ci:`, `test:`, `chore:`.
- **Deployment impact:** New endpoints/behaviors; optional Redis for sessions; higher SMTP volume (monitor deliverability). Feature-flagged rollout recommended.
- **Rollback strategy:** Per-feature flags; revert commits; Redis/DB additions are additive.
- **Risk level:** Low–Medium (mostly additive; integration risk with email/Redis).

---

## Appendix A — Backlog → Phase Traceability

| Backlog item | Phase |
|---|---|
| C1 JWT refresh bug | 1 |
| C2 Secrets hygiene | 1 |
| C5 DNS override | 1 |
| H8 Rate limiting | 1 |
| M4 CORS `*` | 1 |
| M11/L11 Password policy | 1 |
| H1 RBAC `authorize` | 2 |
| C3 Admin module | 2 |
| C4 Verification approval | 2 |
| H2 Auth on write routes | 2 |
| H7 Wire user.routes | 2 |
| H4 Auth controller extraction | 3 |
| H5 Error-handling standardization | 3 |
| H6 Dead/duplicate code | 3 |
| M6 lean() consistency | 3/4 |
| L10 DTO consolidation | 3 |
| H3 Validators (remaining) | 4 |
| M7 Ownership checks | 4 |
| M1 resolveUser policy | 4 |
| M2 N+1 queries | 5 |
| M3 Pagination | 5 |
| M13 Search indexes | 5 |
| L7/L8 Cloudinary/email singletons | 5 |
| L12 Data retention | 5 |
| M8 Sessions | 6 |
| M9 Uploads | 6 |
| M10 Community membership | 6 |
| M11 (follow) Connections | 6 |
| M12 Email notifications | 6 |
| L1 Swagger coverage | 6 |
| L2 README fix | 6 |
| L3 Tests | 6 |
| L4 Lint/format | 6 |
| L5 CI | 6 |
| L6 Response envelope | 3/6 |
| L9 Structured logging | 6 |

## Appendix B — Open Questions (resolve before/with Phase 2)

1. **OAuth user provisioning:** pre-create users at login (current silent behavior) or require explicit registration? Drives Phase 4 `resolveUser` policy.
2. **Token/session model:** stateless JWT-only (Phase 6 becomes token-blacklist) vs persistent `Session` model/Redis? Drives Phase 6 sessions + Phase 1 refresh strategy.
3. **Real-time messaging:** WebSocket vs SSE vs polling? Out of scope for this roadmap's must-haves; schedule as follow-up.
4. **Admin scope:** which entities need moderation (users, posts, comments, communities, verification)? Drives Phase 2 admin service surface.
5. **Release flow:** this plan assumes feature-branch-per-phase + PR to `main`. Prior pushes used force-push to `main` directly — confirm whether trunk-direct commits are preferred instead.
