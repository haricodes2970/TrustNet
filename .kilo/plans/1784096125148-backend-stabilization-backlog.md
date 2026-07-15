# TrustNet Backend — Stabilization Sprint Backlog

**Author:** Backend Technical Lead
**Date:** 2026-07-15
**Scope:** `Main/server/` (Express 5 / Mongoose 9 monolith)
**Status:** Planning only — no code generated.

This backlog is derived from a full read of the backend. Every item carries: **Why it exists**, **Complexity**, **Dependencies**, **Recommended order**, and **Files likely to change**. Items are grouped first by **priority** (Critical → Low) and tagged by **category** from the requested set:

`[BUG]` Critical Bugs · `[FEAT]` Incomplete Features · `[API]` Missing APIs · `[DB]` Database Problems · `[AUTHZ]` Authorization Problems · `[PERF]` Performance Problems · `[SEC]` Security Problems · `[DOC]` Documentation Problems · `[DX]` Developer Experience Improvements

Complexity uses T-shirt sizes (S/M/L/XL). "Order" is a global execution sequence; dependencies drive it.

---

## CRITICAL (blocks production; do first)

### C1 — Refresh-token verification bug in `authenticate` middleware  `[BUG]`
- **Why it exists:** `src/middlewares/auth.js` always calls `jwt.verify(token, jwtConfig.accessSecret)`. When the token comes from the `trustnet_refresh` cookie it is a *refresh* JWT signed with `refreshSecret`, so verification throws on every protected route that legitimately carries only the refresh cookie. Access tokens work; refresh-cookie-based sessions silently fail.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 1
- **Files likely to change:** `src/middlewares/auth.js`, `src/config/jwt.js`

### C2 — Live secrets committed in `.env`  `[SEC]` `[BUG]`
- **Why it exists:** `Main/server/.env` is present in the repo and contains the real MongoDB SRV URI, JWT secrets, Cloudinary keys, SMTP creds, and OAuth client secrets. Anyone with repo access can take over the DB and SMTP.
- **Complexity:** M (rotate + gitignore + secret scanning)
- **Dependencies:** none (must precede any deploy)
- **Order:** 1
- **Files likely to change:** `Main/server/.env`, `Main/server/.gitignore`, possibly add `.env.example`

### C3 — Admin / moderation module entirely missing  `[API]` `[AUTHZ]` `[FEAT]`
- **Why it exists:** The User model defines a `role: "admin"` enum, the project overview promises an "admin dashboard for moderation," and verification can be submitted — but no admin route, controller, service, middleware, or approval workflow exists. Without it, verification can never be approved and content cannot be moderated.
- **Complexity:** XL
- **Dependencies:** C1, A1 (RBAC), I1 (verification approval)
- **Order:** 3 (after C1 and RBAC foundation)
- **Files likely to change:** new `src/routes/admin.routes.js`, `src/controllers/adminController.js`, `src/services/adminService.js`, `src/middlewares/`, `src/routes/index.js`, `src/models/User.js`

### C4 — Verification approval workflow has no backend actor  `[FEAT]` `[BUG]`
- **Why it exists:** `verification.routes.js`/`verificationController.js` let a user upload docs and submit (`status: "pending"`), but nothing can set `approved`/`rejected`. `requireApprovedVerification` then permanently blocks users from `/dashboard`. Submission is a dead end.
- **Complexity:** L (needs admin module)
- **Dependencies:** C3, A1
- **Order:** 4
- **Files likely to change:** `src/services/adminService.js`, `src/controllers/verificationController.js`, `src/models/User.js`, `src/routes/admin.routes.js`

### C5 — Hardcoded DNS override in production entrypoint  `[BUG]` `[SEC]`
- **Why it exists:** `server.js` calls `dns.setServers(["8.8.8.8", "1.1.1.1"])` as a laptop workaround, committed to the entrypoint. Forces all DNS resolution through specific external resolvers regardless of environment.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 2
- **Files likely to change:** `Main/server/server.js`

---

## HIGH (stabilization; do next)

### H1 — No Role-Based Access Control despite `role` field  `[AUTHZ]`
- **Why it exists:** `User.role` enum includes `admin`/etc., but no `requireRole`/`authorize` middleware exists. Every route guards only on "is authenticated," so any logged-in user can hit admin-intended endpoints (once added) and mutate any resource.
- **Complexity:** M
- **Dependencies:** C1
- **Order:** 5
- **Files likely to change:** new `src/middlewares/authorize.js`, `src/routes/*` (mount guards), `src/models/User.js`

### H2 — No authentication on most write routes  `[AUTHZ]` `[SEC]`
- **Why it exists:** `startup.routes.js`, `community.routes.js`, `post.routes.js`, `collaboration.routes.js` define `POST/PUT/DELETE` handlers with **no `authenticate` middleware**. Unauthenticated clients can create/delete any startup, community, post, or collaboration request. (Contrast: profile/messages/notifications correctly use `authenticate`.)
- **Complexity:** M
- **Dependencies:** none (can be parallel to H1)
- **Order:** 5
- **Files likely to change:** `src/routes/startup.routes.js`, `community.routes.js`, `post.routes.js`, `collaboration.routes.js`

### H3 — No input validation on most routes  `[SEC]` `[BUG]`
- **Why it exists:** Only `interaction`, `message`, `profile`, `settings` validators exist. Registration, startup CRUD, community CRUD, collaboration requests, and posts accept arbitrary `req.body` straight into Mongoose. No shape/type/size enforcement → malformed data, potential injection, oversized payloads.
- **Complexity:** L
- **Dependencies:** none
- **Order:** 6
- **Files likely to change:** new `src/validators/*.js`, `src/routes/*` (add `validate(schema)`), `src/middlewares/validate.js` (consider `stripUnknown`)

### H4 — Auth logic lives inside route file (676-line `auth.routes.js`)  `[DX]` `[BUG]`
- **Why it exists:** All register/login/OAuth/2FA/password-reset/account-delete handlers are inline route callbacks; there is no `authController.js`. Violates the controller/service separation used everywhere else, making auth untestable and the route file a merge-conflict magnet.
- **Complexity:** L
- **Dependencies:** none
- **Order:** 7
- **Files likely to change:** new `src/controllers/authController.js`, `src/routes/auth.routes.js` (become thin wiring), `src/services/` (extract user-creation/2FA logic)

### H5 — Inconsistent error handling patterns  `[BUG]` `[DX]`
- **Why it exists:** Some controllers (`userController`, `startupController`, …) `try/catch` and `res.status().json()` directly; others (`verificationController`) call `next(err)` to the global `errorHandler`. Response shapes differ; some bypass the central handler and never return `statusCode` from thrown `ApiError`.
- **Complexity:** M
- **Dependencies:** H4 (good time to standardize)
- **Order:** 8
- **Files likely to change:** all controllers (standardize on `next(err)` + `ApiError`), `src/utils/ApiError.js`, `src/middlewares/errorHandler.js`

### H6 — Duplicate / dead utility code  `[DX]` `[DB]`
- **Why it exists:** `src/services/queryUtils.js` is a byte-for-byte duplicate of `serviceUtils.js` and is never imported. `src/utils/asyncHandler.js` is defined but never used. Five barrel `index.js` files export `{}`.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 9
- **Files likely to change:** delete `src/services/queryUtils.js`, `src/utils/asyncHandler.js` (or wire it in), empty `index.js` barrels

### H7 — `user.routes.js` returns hardcoded mock responses  `[FEAT]` `[BUG]`
- **Why it exists:** `GET /users/:id` and `PUT /users/profile` return static JSON disconnected from `userController`/`userService`. Misleads clients and leaves real user lookups unexposed.
- **Complexity:** S
- **Dependencies:** H2 (auth) recommended
- **Order:** 9
- **Files likely to change:** `src/routes/user.routes.js`, wire to `userController.js`

### H8 — No rate limiting on auth and write endpoints  `[SEC]` `[PERF]`
- **Why it exists:** No `express-rate-limit` (not even a dependency). Login/register/refresh/forgot-password are brute-forceable; write endpoints are abuseable.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 6
- **Files likely to change:** `app.js` (mount limiter), `src/middlewares/` (new `rateLimit.js`)

---

## MEDIUM (correctness, scale, DX)

### M1 — Auto-creation of user documents via `resolveUser`  `[DB]` `[BUG]`
- **Why it exists:** `profileController`, `settingsController`, `interactionService`, `dashboardService` each define `resolveUser(email)` that `catch`-creates a MongoDB user with a random username on first use. Any authenticated (incl. OAuth) email silently spawns a user, polluting the users collection and making "real registered users" indistinguishable.
- **Complexity:** M
- **Dependencies:** none (policy decision needed: pre-provision OAuth users vs. 404)
- **Order:** 10
- **Files likely to change:** `src/controllers/profileController.js`, `settingsController.js`, `src/services/interactionService.js`, `dashboardService.js`, `userService.js`

### M2 — N+1 / redundant queries in messaging & dashboard  `[PERF]`
- **Why it exists:** `messageService.getUnreadCount` loads all conversations then counts messages per user; `messageController`/`notificationController` call `resolveCurrentUserId` (a DB lookup) on every request; `dashboardService` aggregates *all* startups/communities/collaborations with no user scoping. Will not scale.
- **Complexity:** M
- **Dependencies:** none
- **Order:** 11
- **Files likely to change:** `src/services/messageService.js`, `notificationService.js`, `dashboardService.js`, controllers

### M3 — No pagination metadata on list endpoints  `[API]` `[PERF]`
- **Why it exists:** `applyQueryOptions` supports `limit`/`skip` but no service returns `totalCount`/`page`/`pageSize`. Clients cannot render pagination; unbounded `list` calls return whole collections.
- **Complexity:** M
- **Dependencies:** none
- **Order:** 11
- **Files likely to change:** `src/services/serviceUtils.js`, all `*list*` services, controllers, `src/routes/index.js` (maybe shared response shape)

### M4 — CORS fallback to `*` with credentials  `[SEC]` `[AUTHZ]`
- **Why it exists:** `src/middlewares/cors.js` uses `origin: process.env.CLIENT_URL || '*'`. If `CLIENT_URL` is unset, the API allows any origin *and* `credentials: true` → credentialed cross-origin requests from anywhere.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 6
- **Files likely to change:** `src/middlewares/cors.js`

### M5 — No CSRF protection on state-changing routes  `[SEC]`
- **Why it exists:** Cookie-based `trustnet_refresh` + `sameSite: 'lax'` provides partial protection, but `POST/PUT/DELETE` rely solely on CORS + bearer. No CSRF token / double-submit cookie for cookie-authenticated flows.
- **Complexity:** M
- **Dependencies:** M4
- **Order:** 12
- **Files likely to change:** `src/middlewares/`, `app.js`

### M6 — Inconsistent `lean()` usage  `[DB]` `[DX]`
- **Why it exists:** Some services return `.lean()` plain objects, others return Mongoose documents (`userService.createUser` returns a doc; `getUserById` returns lean). Mixed contracts cause `.toObject()` calls in some places (`settingsService`) and silent no-ops in others.
- **Complexity:** S
- **Dependencies:** M1 (touch same files)
- **Order:** 10
- **Files likely to change:** `src/services/userService.js`, `startupService.js`, `communityService.js`, `postService.js`, `settingsService.js`

### M7 — No ownership/authorization checks on resources  `[AUTHZ]`
- **Why it exists:** `updateStartup`/`deleteStartup`, `updateCommunity`/`deleteCommunity`, post/comment mutations, and message deletes check only "is it mine" ad-hoc (comments/messages do, startups/communities do not). No centralized ownership guard → any user can edit/delete others' startups/communities/posts.
- **Complexity:** M
- **Dependencies:** H1, H2
- **Order:** 12
- **Files likely to change:** `src/services/startupService.js`, `communityService.js`, `postService.js`, `collaborationService.js`, related controllers

### M8 — Session management is a placeholder/TODO  `[FEAT]` `[BUG]`
- **Why it exists:** `settingsController.getSessions`/`deleteSession` return fake data and admit in comments there is no real session store. Cannot list/revoke devices; logout only clears the cookie.
- **Complexity:** L
- **Dependencies:** C1 (token model), H1
- **Order:** 13
- **Files likely to change:** new `src/models/Session.js` or Redis store, `src/services/sessionService.js`, `src/controllers/settingsController.js`, `auth.routes.js`

### M9 — Post image upload & message attachment upload not implemented  `[API]` `[FEAT]`
- **Why it exists:** `Post.images` and `Message.attachments` are string arrays, but there is no upload handler/route (unlike profile/verification which use Multer→Cloudinary). Clients must hand-craft URLs.
- **Complexity:** M
- **Dependencies:** H3 (validation)
- **Order:** 13
- **Files likely to change:** `src/routes/post.routes.js`, `message.routes.js`, new upload handlers, `src/services/cloudinary.service.js`

### M10 — Community membership management missing  `[API]` `[FEAT]`
- **Why it exists:** `Community.members` array exists but there are no join/leave/list-members/remove-member endpoints, and `type` (public/private/restricted) is unenforced.
- **Complexity:** M
- **Dependencies:** H1, H2
- **Order:** 13
- **Files likely to change:** `src/routes/community.routes.js`, `src/services/communityService.js`, `communityController.js`

### M11 — Follow / unfollow endpoints missing  `[API]` `[FEAT]`
- **Why it exists:** `User.followersCount`/`followingCount` exist but no endpoints mutate them or store the follow graph.
- **Complexity:** M
- **Dependencies:** H1, H2
- **Order:** 14
- **Files likely to change:** new `src/routes/connection.routes.js`, `src/services/connectionService.js`, `src/models/Follow.js` (or embed), `userService.js`

### M12 — No email notifications (only password reset)  `[API]` `[FEAT]`
- **Why it exists:** `email.service.js` sends only reset emails. Notifications, verification outcomes, collaboration responses are never emailed despite `UserPreference.emailNotifications`/`marketingEmails` flags.
- **Complexity:** M
- **Dependencies:** C4 (verification outcome), C3 (admin)
- **Order:** 14
- **Files likely to change:** `src/services/email.service.js`, `notificationService.js`, `collaborationService.js`

### M13 — Search uses regex without leveraging text indexes  `[PERF]` `[DB]`
- **Why it exists:** `searchService` builds `RegExp` `$or` queries per collection. `Startup`/`Post` already have `text` indexes that are unused; `User`/`Community` regex scans will table-scan as data grows. No ranking, no pagination, no index on `User.username`/`fullName` for the common case.
- **Complexity:** M
- **Dependencies:** M3 (pagination)
- **Order:** 15
- **Files likely to change:** `src/services/searchService.js`, model indexes (`User.js`, `Community.js`)

### M14 — `handleServiceError` re-throws same error object  `[DX]` `[BUG]`
- **Why it exists:** `serviceUtils.handleServiceError` returns the original `error` when it already has a message, so thrown `ApiError`/`Error` from models survives unwrapped and may bypass intended fallback messages; no normalization to `ApiError` with statusCode.
- **Complexity:** S
- **Dependencies:** H5
- **Order:** 8
- **Files likely to change:** `src/services/serviceUtils.js`

---

## LOW (polish, docs, DX)

### L1 — Swagger coverage incomplete & inconsistent  `[DOC]`
- **Why it exists:** `docs/swagger.js` scans `src/routes/*.js` for `@openapi` blocks, but only `post`, `message`, `notification`, `settings` routes have them. Auth, startup, community, user, search, recommendation, verification, dashboard are undocumented in Swagger despite `/api/docs` being advertised.
- **Complexity:** M
- **Dependencies:** none
- **Order:** 16
- **Files likely to change:** all `src/routes/*.js` (add `@openapi` annotations)

### L2 — README contradicts actual backend state  `[DOC]`
- **Why it exists:** `README.md` says "Messages and notifications are still frontend-only placeholders because backend modules for them do not exist yet," but full `message`/`notification` services, models, routes, and controllers DO exist. Misleads onboarding.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 16
- **Files likely to change:** `README.md`

### L3 — No tests / no test strategy  `[DX]`
- **Why it exists:** `test/index.js` exports `{}`; `package.json` `"test": "echo \"No tests configured yet\""`. Stabilization work is unsafe without a baseline (unit for services, integration for routes, auth edge cases).
- **Complexity:** L
- **Dependencies:** H4, H5 (stabilize first so tests have a stable target)
- **Order:** 17
- **Files likely to change:** `package.json` (add vitest/jest + supertest), `test/`, new `src/services/__tests__`, `src/routes/__tests__`

### L4 — No lint / format / pre-commit config  `[DX]`
- **Why it exists:** No ESLint/Prettier/EditorConfig/Husky in `package.json` or repo. Style drift (mixed quotes, `require` vs `import`, trailing commas) is already visible across files.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 16
- **Files likely to change:** add `.eslintrc`, `.prettierrc`, `package.json` scripts

### L5 — No CI pipeline  `[DX]`
- **Why it exists:** Nothing runs lint/test on push. Combined with L3, regressions ship silently.
- **Complexity:** S
- **Dependencies:** L3, L4
- **Order:** 18
- **Files likely to change:** add `.github/workflows/ci.yml`

### L6 — Centralized response envelope not enforced  `[DX]` `[DOC]`
- **Why it exists:** Responses mix `{ success, data }`, `{ success, message }`, and raw error objects. No shared serializer/`ApiResponse` helper. Clients must special-case.
- **Complexity:** M
- **Dependencies:** H5
- **Order:** 17
- **Files likely to change:** new `src/utils/response.js`, all controllers

### L7 — Cloudinary config is a global singleton at load time  `[DX]` `[PERF]`
- **Why it exists:** `cloudinary.service.js` configures the module-level client on import using `process.env`. Hard to test, reconfigure per-tenant, or mock.
- **Complexity:** S
- **Dependencies:** none
- **Order:** 16
- **Files likely to change:** `src/services/cloudinary.service.js` (lazy init / factory)

### L8 — Email transporter created per call  `[PERF]` `[DX]`
- **Why it exists:** `email.service.js#createTransporter()` runs inside `sendPasswordResetEmail` on every invocation, re-reading env and rebuilding the transport each time.
- **Complexity:** S
- **Dependencies:** M12
- **Order:** 14
- **Files likely to change:** `src/services/email.service.js`

### L9 — No structured logging / correlation IDs  `[DX]` `[PERF]`
- **Why it exists:** Only `morgan('dev')` to stdout. No log levels, no file rotation, no request `correlationId` for tracing across services.
- **Complexity:** M
- **Dependencies:** none
- **Order:** 17
- **Files likely to change:** `src/middlewares/logger.js`, `app.js`, maybe `src/utils/logger.js`

### L10 — Duplicate business logic (`toUserResponse`, `mapProfileInput`)  `[DX]`
- **Why it exists:** `toUserResponse` defined once in `auth.routes.js`; `mapProfileInput` duplicated in `profileController` and `settingsService` with *different* field lists. DTO mapping is scattered and will drift.
- **Complexity:** S
- **Dependencies:** H4, M1
- **Order:** 10
- **Files likely to change:** new `src/utils/userDto.js`, `src/controllers/profileController.js`, `src/services/settingsService.js`, `auth.routes.js`

### L11 — Password strength only enforced on `change-password`  `[SEC]`
- **Why it exists:** `register` and `reset-password` accept any ≥8-char password; only `change-password` requires upper/lower/digit. Inconsistent policy.
- **Complexity:** S
- **Dependencies:** H3 (validators)
- **Order:** 6
- **Files likely to change:** `src/routes/auth.routes.js`, new `src/validators/auth.validators.js`

### L12 — No data-retention / cleanup for notifications & messages  `[DB]`
- **Why it exists:** `Notification` and `Message` grow unbounded; no TTL, no soft-delete sweep, no archive policy. `lastMessage` embedded in `Conversation` can desync.
- **Complexity:** M
- **Dependencies:** none
- **Order:** 15
- **Files likely to change:** `src/models/Notification.js`, `Message.js`, `Conversation.js`, maybe `src/services/cleanupService.js`

---

## Execution Order Summary (dependency-driven)

1. **C1** refresh-token bug → **C5** DNS → **C2** secrets → **H1** RBAC → **C3** admin module → **C4** verification approval → **H2/H3/H4/H8/M4/M11** auth+validation+CSRF+rate-limit hardening → **H5/H7/H6/M14** error-handling & dead-code cleanup → **M1/M6/L10** user-resolution & DTO consolidation → **M2/M3/M13/L12** perf & pagination → **M7/M8/M9/M10/M11/M12** ownership, sessions, uploads, membership, follows, email → **L1–L9** docs, tests, CI, logging, DX.

## Open Questions for the Team
- **OAuth user provisioning policy:** pre-create users at login (current silent behavior) or require explicit registration? Drives M1.
- **Token model for sessions:** stateless JWT-only (M8 becomes token-blacklist) vs. persistent `Session` model/Redis? Drives M8 + C1 refresh strategy.
- **Real-time messaging:** WebSocket vs. SSE vs. polling? Drives the eventual replacement of the current poll-only message architecture (Medium/Low follow-up, not in this sprint's must-haves).
- **Admin scope:** which entities need moderation (users, posts, comments, communities, verification)? Drives C3/C4 shape.
