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

## Investor data

`/api/v1/investors` (`InvestorProfile`) is a public directory by design (list/get unauthenticated, same class of surface as `Startup`'s and Job's public listings) — no new PII class beyond what's already public elsewhere (organization name, investment thesis, stated preferences), but same enumeration/scraping caveat as Job's public surface applies (no rate limiting, tracked in Phase 1). `/api/v1/investment-interests` has no public tier at all (every route authenticated).

`investmentInterestService.js` deliberately duplicates `workspaceService.resolveWorkspaceAccess()`'s/`jobService.resolveStartupAccess()`'s role-computation logic rather than sharing either (explicit instruction, tracked in [BACKLOG.md](BACKLOG.md)) — a third independent implementation of the same founder/admin/contributor rules now exists; a future fix to any one must be checked against the other two until they're unified in a dedicated authorization cleanup phase.

## Funding data

`/api/v1/funding-rounds` has a public tier for `open`, non-archived rounds (title/target/raised/currency) — a new financial-data public surface, though a narrower one than Job's or Investor's public listings (no contributor roster, no investor identities exposed). Non-open/archived rounds return 404, not 403, to anyone without a role on the Startup, same concealment convention as Job's draft/closed jobs. `/api/v1/funding-contributions` has no public tier at all.

`fundingRoundService.js` deliberately duplicates `workspaceService.resolveWorkspaceAccess()`'s/`jobService.resolveStartupAccess()`'s/`investmentInterestService.resolveStartupAccess()`'s role-computation logic rather than sharing any of them (explicit instruction, tracked in [BACKLOG.md](BACKLOG.md)) — a fourth independent implementation of the same founder/admin/contributor rules now exists; a future fix to any one must be checked against the other three until unified in a dedicated authorization cleanup phase.

**Financial-integrity note:** confirming a contribution atomically `$inc`s `FundingRound.raisedAmount` and `Startup.fundingRaised` — never a read-modify-write, and guarded against a double-confirm race by a `findOneAndUpdate({status:"pledged"})` filter. However, the status transition and the two increments are three separate operations, not one transaction (no transaction infrastructure exists in this codebase) — a crash mid-sequence could leave state inconsistent. Flagged in [BACKLOG.md](BACKLOG.md) as a production-readiness gap before this handles real financial commitments, not a bug found in testing.

## Marketplace data

`/api/v1/provider-profiles` and `/api/v1/service-listings` both have public tiers (provider directory; published, non-archived listings), same class of surface as `Startup`'s/Job's/Investor's/FundingRound's public listings — same standing enumeration/scraping caveat (no rate limiting, tracked in Phase 1) applies. `/api/v1/engagement-requests` has no public tier at all.

`engagementRequestService.js` deliberately duplicates `workspaceService.resolveWorkspaceAccess()`'s/`jobService.resolveStartupAccess()`'s/`investmentInterestService.resolveStartupAccess()`'s/`fundingRoundService.resolveStartupAccess()`'s role-computation logic rather than sharing any of them (explicit instruction, tracked in [BACKLOG.md](BACKLOG.md)) — a fifth independent implementation of the same founder/admin/contributor rules now exists; a future fix to any one must be checked against the other four until unified in a dedicated authorization cleanup phase.

`EngagementRequest` is the first resource requiring two independent authority checks on the same document (Startup-role for the requester, flat `ProviderProfile` ownership for the fulfiller) — a bug in either resolution path could leak a request across an unrelated Startup or an unrelated provider. Both directions have direct, explicit integration-test coverage (see [docs/modules/marketplace.md](docs/modules/marketplace.md)).

## Analytics data

`/api/v1/analytics/*` exposes internal business metrics (funding totals, hiring funnel, investor activity counts) that are more sensitive in aggregate than any single record they're derived from — no public tier exists (every route requires authentication and a role on the target Startup). Unlike every other module's public surfaces (Job/Investor/FundingRound/ServiceListing), there is no anonymous-visitor tier here at all, by design.

`analyticsService.js` deliberately duplicates `workspaceService.resolveWorkspaceAccess()`'s/`jobService.resolveStartupAccess()`'s/`investmentInterestService.resolveStartupAccess()`'s/`fundingRoundService.resolveStartupAccess()`'s/`engagementRequestService.resolveStartupAccess()`'s role-computation logic rather than sharing any of them (explicit instruction, tracked in [BACKLOG.md](BACKLOG.md)) — a sixth independent implementation of the same founder/admin/contributor rules now exists; a future fix to any one must be checked against the other five until unified in a dedicated authorization cleanup phase.

This is the first fully read-only module in the codebase — no mutation surface, so no write-side attack class (injection via update payloads, etc.) applies here; the only relevant risk is over-broad read access, which the any-role gate on every endpoint is the sole defense against.

## Reports data

`/api/v1/reports/:reportType` exposes the same class of internal business metrics Analytics does, as a downloadable file (CSV) or structured JSON — a materially higher exfiltration risk than an in-app read, since a file can leave the platform entirely. Access is deliberately narrower than Analytics: **owner/admin only, contributor excluded** (403) — the first module in this codebase to restrict a read action below contributor tier. No public tier at all.

Reports does not introduce a new authorization surface — it reuses `analyticsService.resolveStartupAccess`/`assertAnyRole` directly rather than a seventh independent Startup-role implementation, so it inherits whatever correctness/risk profile those functions already have rather than adding a new one.

CSV export is hand-rolled (no new dependency) with RFC 4180-style field escaping (`escapeCsvField` in `reportService.js`) — values are never interpolated unescaped into the CSV body, mitigating basic CSV/formula-injection concerns (a value beginning with `=`/`+`/`-`/`@` that a spreadsheet application might interpret as a formula is still emitted as plain escaped text here, not sanitized against that specific attack class — worth a dedicated look if Reports' CSV output is ever opened directly in Excel/Sheets by non-technical users at scale).

## AI data

`/api/v1/ai/insights` performs no authorization of its own — every capability inherits its access boundary entirely from the existing service it calls (`analyticsService`, `reportService`, `taskService`, `serviceListingService`). This means AI's security posture is exactly as strong as those services' own, and no weaker: there is no code path in `aiService.js` capable of reading data an already-authorized-elsewhere call hasn't approved. `report-explanation` correctly inherits Reports' stricter owner/admin-only gate (contributor denied, 403) while every other capability inherits Analytics' any-role gate — directly tested.

**New risk class: prompt injection.** The `question` field is untrusted free text that is syntactically valid (Joi accepts any string up to 500 chars) but could be semantically adversarial to a generative system — the first input in this codebase where schema validation alone cannot fully characterize the risk. Mitigated by an explicit system-prompt instruction (`SAFETY_PREAMBLE`) to treat both the context data and the user's question as plain text, never as commands. **This mitigation is currently untested against a real model** — the default `aiProviderService` implementation doesn't interpret text at all (it only echoes its inputs), so this risk is dormant until a real LLM provider is wired in (see `BACKLOG.md`). Re-review at that point.

**No real LLM provider is integrated this phase** — no API key, no outbound network call, no new dependency. `aiProviderService.generateCompletion()` is the single seam where a real provider would be wired in; until then, no user data leaves this backend as part of an AI request.

**Rate limiting** is a lightweight, in-memory, per-user sliding window (10 requests/minute) — the first rate limiting of any kind in this codebase (every other module's public surfaces still have none, per the standing Phase 1 backlog item). Not persisted, not shared across instances — acceptable for a single-instance MVP, flagged in `BACKLOG.md` as needing a shared store before scaling out or before a real (costed) provider is wired in.

## Reporting a vulnerability

TODO: no formal security disclosure process documented yet. Until one exists, report directly to the team lead (see [TEAM.md](TEAM.md)) rather than filing a public issue.

## Open items

See [ROADMAP.md](ROADMAP.md) Phase 1 and [BACKLOG.md](BACKLOG.md) for the full security-hardening backlog: rate limiting, CORS lockdown, password policy, secrets hygiene audit, refresh-token secret fix.
