# Security

Security posture of the TrustNet backend, current gaps, and reporting process. Cross-ref [ARCHITECTURE.md](ARCHITECTURE.md), [API_GUIDELINES.md](API_GUIDELINES.md), [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md).

## Auth model

- JWT access tokens (short-lived, `JWT_ACCESS_EXPIRES_IN`, default `15m`) + refresh tokens (`JWT_REFRESH_EXPIRES_IN`, default `7d`) stored in an httpOnly `trustnet_refresh` cookie.
- Separate secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (config in `src/config/jwt.js`), falling back to `JWT_SECRET` / hardcoded dev defaults if unset — **do not rely on the fallback in production**.
- OAuth (Google, LinkedIn) configured via `src/config/oauth.js`, redirects through frontend origin to keep cookies same-site.
- 2FA: TOTP via speakeasy, secret encrypted at rest (`twoFactor.service.js`), QR provisioning via `qrcode`.

## Known issue — refresh token verification

Per the backend stabilization backlog ([.kilo/plans/1784096125148-backend-stabilization-backlog.md](.kilo/plans/1784096125148-backend-stabilization-backlog.md)), the auth middleware has been flagged as verifying refresh-cookie-derived tokens against `accessSecret` instead of `refreshSecret`. **Verify current state in `src/middlewares/auth.js` before relying on this being fixed** — do not assume the backlog item is resolved just because it's listed.

## Password handling

- Passwords hashed via `bcryptjs`, field is `select: false` on the `User` model — never returned by default queries.
- Password policy enforcement (min length, complexity) on register/reset/change-password is a backlog item (Phase 1), not confirmed implemented — check `src/validators/` and controller logic before assuming enforcement exists.

## Sensitive fields (never log or return raw)

`password`, `resetPasswordToken`, `resetPasswordExpires`, `twoFactorSecret`, `twoFactorPendingSecret` — all `select: false` in `User.js`. See [DATABASE.md](DATABASE.md#sensitive-fields).

## Transport & headers

- `helmet` middleware sets standard security headers.
- CORS origin from `CLIENT_URL` or `*` — lock to explicit origin list before production ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
- No rate limiting on `/auth/*` yet — brute-force risk on login/reset endpoints. Tracked in [ROADMAP.md](ROADMAP.md) Phase 1.

## Role-based access

`role` enum on `User`: founder, entrepreneur, investor, client, mentor, builder, admin. `authorize(...roles)` middleware gates admin routes (`/api/v1/admin/*`). Self-assignment of the admin role is explicitly blocked (see commit `cbe98e3 fix(security): prevent self-assignment of admin role`).

## Verification (KYC) gate

`requireApprovedVerification` middleware blocks `/api/v1/dashboard` until `User.verificationStatus === "approved"`. Verification documents uploaded to Cloudinary, reviewed via `/api/v1/admin/verifications/*`. See [docs/modules/verification.md](docs/modules/verification.md), [docs/modules/admin.md](docs/modules/admin.md).

## Secrets management

`.env` holds all secrets (`MONGO_URI`, JWT secrets, Cloudinary keys, SMTP creds, `TWO_FACTOR_ENCRYPTION_KEY`). Confirm `.env` is gitignored and an `.env.example` exists before onboarding new engineers (tracked as a Phase 1 backlog item — verify current repo state, don't assume done).

## Public read surfaces (Hiring)

`GET /api/v1/jobs` and `GET /api/v1/jobs/:id` are the first genuinely unauthenticated read endpoints in this codebase beyond `Startup`'s own public listing (`GET /startups`, `GET /startups/:id`). Published, non-archived jobs are intentionally public (a job board); draft/closed/archived jobs return **404, not 403**, deliberately concealing existence, not just content, from anyone without a role on the job's Startup — see [docs/modules/hiring.md](docs/modules/hiring.md).

This introduces a new attack-surface class not previously present: scraping and enumeration of a public job board. No rate limiting exists on these routes (same repo-wide gap as `/auth/*`, tracked in Phase 1) — worth a dedicated look before production given the endpoints are unauthenticated by design, not just under-protected.

`jobService.js` deliberately duplicates `workspaceService.resolveWorkspaceAccess()`'s role-computation logic rather than sharing it (explicit instruction, tracked in [BACKLOG.md](BACKLOG.md)) — two independent implementations of the same founder/admin/contributor rules now exist; a future fix to one must be checked against the other until they're unified.

## Candidate data (Applications)

`/api/v1/applications` handles real personal data — resumes and cover letters — for the first time in this codebase. No public tier exists (every route requires authentication, unlike Job's public read surface), and internal review `notes` are redacted from the candidate's own view of their application (`applicationService.redactForCandidate`) — the first field-level access control in this codebase, not just resource-level.

Compliance considerations (retention limits, right-to-deletion, jurisdiction-specific handling requirements) are **not addressed** by this implementation — flagged in [BACKLOG.md](BACKLOG.md) as a legal/business question, not resolved here. Resume files are stored via the same local-disk `storageService` provider Documents uses — no encryption-at-rest beyond whatever the underlying filesystem/OS provides, worth revisiting before this handles real candidate data in production.

## Reporting a vulnerability

TODO: no formal security disclosure process documented yet. Until one exists, report directly to the team lead (see [TEAM.md](TEAM.md)) rather than filing a public issue.

## Open items

See [ROADMAP.md](ROADMAP.md) Phase 1 and [BACKLOG.md](BACKLOG.md) for the full security-hardening backlog: rate limiting, CORS lockdown, password policy, secrets hygiene audit, refresh-token secret fix.
