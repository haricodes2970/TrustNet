# Module: Auth

Files: `src/routes/auth.routes.js`, `src/config/jwt.js`, `src/config/oauth.js`, `src/services/twoFactor.service.js`, `src/services/email.service.js`, `src/models/User.js`. Government ID/KYC verification (Phase 16B): `src/routes/verification.routes.js`, `src/controllers/verificationController.js`, `src/middlewares/verification.js`, `src/services/verificationDocument.service.js`; admin side: `src/routes/admin.routes.js` (verification section), `src/controllers/adminVerificationController.js`, `src/services/adminVerificationService.js`. See [SECURITY.md](../../SECURITY.md), [docs/AUTH_FLOW.md](../AUTH_FLOW.md), [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Routes (`/api/v1/auth`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | — | register new user |
| POST | `/login` | — | login with email/password |
| POST | `/login/2fa` | — | submit 2FA token for pending login |
| GET | `/google` | — | redirect to Google OAuth |
| GET | `/google/callback` | — | Google OAuth callback |
| GET | `/linkedin` | — | redirect to LinkedIn OAuth |
| GET | `/linkedin/callback` | — | LinkedIn OAuth callback |
| POST | `/refresh` | refresh cookie | rotate access token |
| POST | `/logout` | — | clear refresh cookie |
| DELETE | `/account` | required | delete own account |
| GET | `/2fa` | required | check 2FA status |
| POST | `/2fa/setup` | required | initiate 2FA setup |
| POST | `/2fa/enable` | required | enable 2FA with TOTP code |
| POST | `/2fa/disable` | required | disable 2FA (password + code) |
| GET | `/me` | token or cookie | get current user |
| POST | `/verify-email` | — | verify a registered email with a 6-digit OTP (`{email, otp}` body) |
| POST | `/resend-verification` | — | issue and email a fresh OTP for an unverified account (`{email}` body, enumeration-safe) |
| POST | `/forgot-password` | — | send password reset email |
| POST | `/reset-password` | — | reset password with token |
| PUT | `/change-password` | required | change password |

## Model fields used

`User`: `password`, `resetPasswordToken`, `resetPasswordExpires`, `twoFactorEnabled`, `twoFactorSecret`, `twoFactorPendingSecret`, `googleId`, `linkedinId`, `email`, `emailVerified`, `emailVerifiedAt`, `emailVerificationCodeHash`, `emailVerificationExpires`, `emailVerificationAttempts`. See [DATABASE.md](../../DATABASE.md#user-userjs).

## Email OTP verification (Phase 16A)

**Deliberately a separate concern from `isVerified`/`verificationStatus`/`verificationDocuments`**, which are the Government ID/KYC admin-approval workflow (Phase 16B/16C) - a different field family entirely, gated by the existing `requireApprovedVerification` middleware and the admin verification queue. Conflating the two would have broken both. `emailVerified`/`emailVerifiedAt` track only "does this account control the email address it registered with"; the KYC fields are untouched by anything in this section.

**Flow:** `POST /register` creates the account with `emailVerified: false` and, in the same request, generates a 6-digit OTP (`crypto.randomInt` - a CSPRNG, not `Math.random()` - same length convention as this codebase's own 2FA TOTP codes), persists only its sha256 hash (`emailVerificationCodeHash`, `select: false`, same pattern as `resetPasswordToken`), and emails the plaintext code via `email.service.js`'s `sendOtpVerificationEmail`. The OTP expires after 10 minutes (`emailVerificationExpires`). Registration succeeds (`201`) even if the email fails to send - the OTP is still persisted, and `POST /resend-verification` covers delivery failures; this preserves the pre-existing "register always succeeds once validation/uniqueness pass" contract rather than weakening it into "register succeeds only if SMTP is up."

**`POST /verify-email`** (`{email, otp}`, replaces the prior no-op `GET` stub - a one-time code belongs in a request body, not a URL that ends up in access/proxy logs): an atomic `findOneAndUpdate` keyed on `{_id, emailVerified: false, matching hash, unexpired}` guarantees the account is marked verified exactly once even under two concurrent identical requests - the loser gets `null` back and the same generic error, not a duplicate state change. "No such account," "wrong OTP," "expired OTP," and "locked out" all return the identical generic `400 Invalid or expired verification code.` - closing both account enumeration (can't tell a non-existent email from a wrong guess) and cross-account verification (can't verify an account without also knowing its live, unused, unexpired OTP) with one response shape. "Already verified" gets its own `200` message - reaching that branch already requires knowing a valid email *and* a format-correct OTP, so it isn't a new enumeration surface, and collapsing it into the generic error would make a harmless double-submit look like a failure.

**`POST /resend-verification`** (`{email}`, implemented - was a stub that always returned success and did nothing): unlike `/verify-email`, this endpoint requires no proof of account ownership at all, so - matching `/forgot-password`'s existing posture - it always returns the same generic success message regardless of whether the account exists or is already verified. Only a real, existing, unverified account actually gets a new OTP, which overwrites the previous hash/expiry/attempt-counter outright (the old code stops working immediately on resend, not just once it expires).

**Brute-force protection, two layers:** a per-account `emailVerificationAttempts` counter locks an OTP out after 5 wrong guesses (defense-in-depth against an attacker distributing guesses for one account across many IPs), plus a new `emailVerifyLimiter` (20 requests/15min per IP, via the existing `createLimiter`/`rateLimitsConfig` factory - not a parallel rate-limiting system) on the endpoint itself. `resendVerificationLimiter` already existed (wired to the stub, unused) and is reused as-is, raised from 3/hour to 5/hour to give real test-suite headroom while staying a meaningful anti-abuse throttle for an email-sending endpoint.

**OAuth interaction:** Google/LinkedIn signups set `emailVerified`/`emailVerifiedAt` from the provider's own `email_verified` signal at creation time - no OTP is ever issued for an OAuth account, so without this an OAuth user would be permanently stuck unverified. The pre-existing `isVerified: !!profile.email_verified` line (writing to the unrelated KYC field) is untouched.

**Login/refresh/logout/password-reset/change-password are unaffected on purpose.** This phase does not gate login on `emailVerified` - whether/how to do that is an `accountStatus`-state-machine decision explicitly deferred to Phase 16C (see `BACKLOG.md`). `emailVerified`/`emailVerifiedAt` are exposed via the `/register`, `/verify-email`, and `/me` response shapes so a client can show a "please verify your email" banner without any server-side access restriction today.

## Government ID / KYC Verification (Phase 16B)

**This functionality already existed** (built in the Admin Dashboard phase) - Phase 16B was an audit-and-fix pass against it, not a rebuild. `verificationStatus`/`isVerified`/`verificationDocuments` on `User` remain the KYC fields, unchanged in shape; nothing here touches `emailVerified` (Phase 16A) or introduces a unified `accountStatus`.

**Routes (`/api/v1/verification`, auth required):**

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | current user's own verification status + documents (signed URLs) |
| POST | `/documents/:type` | upload/replace one document (`government_id`\|`company_registration`\|`business_website`\|`linkedin`\|`startup_registration`); requires `emailVerified: true` |
| POST | `/submit` | submit for review once all four required document types are uploaded; requires `emailVerified: true` |

**Admin routes (`/api/v1/admin/verifications`, admin-only):** `GET /` (pending queue, metadata-only), `GET /:userId` (single user, signed document URLs), `POST /:userId/approve`, `POST /:userId/reject` (`{reason}`), `POST /:userId/request-resubmission` (`{reason}`).

**Lifecycle:** `draft` (or `not_submitted`) → upload documents → `POST /submit` sets every document to `pending` and `verificationStatus: "pending"` → admin `approve` (→ `approved`, `isVerified: true`) **or** `reject` (→ `rejected`, `isVerified: false`, documents marked `rejected` with an optional `rejectionReason`) **or** `request-resubmission` (→ `resubmission_requested`, same document-marking as reject, but a distinct status signaling "not final, please re-upload"). From `rejected`/`resubmission_requested`, the user can re-upload and re-submit, returning to `pending`. No additional states were introduced this phase, per instruction.

### What was audited and fixed

- **Critical: verification documents (government IDs) were publicly exposed.** Uploaded via Cloudinary's default public delivery type; the stored URL required no authentication to view and was returned as-is in every API response. Fixed by uploading with `type: "authenticated"` and generating a fresh, signed, 15-minute-expiring URL on every read (`verificationDocument.service.js`, reuses the existing Cloudinary provider - no new storage system). See that file's own header comment for the full explanation. Account-deletion cleanup (`deleteVerificationAssets` in `auth.routes.js`) updated to match, or it would have silently stopped finding/deleting the (now differently-typed) assets.
- **KYC submission had no prerequisite check on email verification**, despite the specified workflow starting with "Email Verified → User uploads Government ID." New `requireVerifiedEmail` middleware gates the two mutating verification routes (not `GET`, not login - Phase 16A's decision to leave login ungated is unchanged).
- **No audit logging on the user-facing side** (document upload/replacement, submission) despite admin approve/reject/resubmission already logging. Added `verification.document_upload` (`{documentType}` only, never the file) and `verification.submit`.
- **No "under review" confirmation email**, despite being an explicit step in the specified workflow. Added `sendVerificationSubmittedEmail`.
- **Oversized uploads returned a raw 500** (multer's `MulterError` has no `.statusCode`, and the centralized error handler only reads that field) instead of a clean 400. Normalized in `verification.routes.js`; the same gap likely exists in the Documents module's own multer usage, not fixed here (out of scope) - see `BACKLOG.md`.
- **No state guards on admin decisions.** An admin could "approve" an account that never submitted anything (`verificationStatus` still `draft`), or reject an already-rejected account (sending a duplicate email every time), and two concurrent decisions on the same account could race via an unconditional update. Fixed: a decision requires `verificationStatus === "pending"` (409 otherwise - "missing documents cannot be approved"); reaching the *same* status again is now an idempotent no-op (no duplicate email); mutations use a conditional `findOneAndUpdate({_id, verificationStatus:"pending"}, ...)` instead of an unconditional update, closing the race.
- **`adminVerificationController` hardcoded every error to 404** regardless of cause. Fixed to the standard `error instanceof ApiError ? error.statusCode : 500` convention used everywhere else in this codebase.
- **Malformed `userId` on any admin verification endpoint** now returns a clean `400` instead of a raw Mongoose `CastError`-derived failure.

### Reviewed, not changed

- **Cross-user document access was never actually possible** - every user-facing route operates on `req.user.id` only; there is no endpoint that accepts a target user id from a non-admin caller. Confirmed via test, not a gap.
- **Admin notification** - a new submission becomes visible to admins immediately through the existing `GET /admin/verifications` pending-queue query (filters `verificationStatus: "pending"`). No separate notification mechanism was added, per instruction.
- **Rejecting an already-*approved*** account is still permitted (an admin can act on new information after the fact) - only *repeating the exact same decision* is now idempotent. This is a deliberate, narrow scope choice, not a full state-transition matrix; see `BACKLOG.md` for the Phase 16C follow-up.

## Unified accountStatus (Phase 16C)

**Audit first, minimum states, no redesign** - this phase's mandate was to unify the *view* of account state, not to change how `emailVerified`/`verificationStatus`/`isVerified`/`isActive` themselves are read, written, or guarded. Every one of those four fields is unchanged in shape and behavior; `accountStatus` is a fifth, purely *derived* field layered on top.

### The four existing state fields (audited this phase)

| Field | Owns | Consumers |
|---|---|---|
| `emailVerified` / `emailVerifiedAt` | "Does this account control the email it registered with" (Phase 16A) | `requireVerifiedEmail` (gates KYC document upload/submit), OTP verify/resend, OAuth signup, `toUserResponse` |
| `verificationStatus` / `isVerified` / `verificationDocuments` | Government ID/KYC admin-approval workflow (Phase 16B) | `verificationController`, `requireApprovedVerification` (gates `/dashboard` only - **not** login), `adminVerificationService`, `adminDashboardService` counts, `adminUserService` filter, `providerProfileService`'s read-only "verification awareness", search results |
| `isActive` / `deletedAt` / `suspensionReason` | Account suspension/deletion, independent of verification | `authenticate` (the login/every-request gate - checks **only** this, nothing about verification), `adminUserService` suspend/reactivate/soft-delete, every module that filters "is the other party's account active" (messaging, search, providers, investments, funding) |
| `accountStatus` (new) | A derived external summary of `emailVerified` + `verificationStatus` combined | Exposed in `toUserResponse`, `GET /verification`; **never independently written** |

Confirmed via direct inspection of `middlewares/auth.js`: **login requires only `isActive !== false` and `!deletedAt`** - not `emailVerified`, not KYC approval. This was already true before this phase (Phase 16A's own documented decision) and is preserved unchanged. `requireApprovedVerification` is applied to exactly one route group (`dashboard.routes.js`), not to login.

### AccountStatus state machine

Six states - the phase's conceptual 7-rung lifecycle (`EMAIL_PENDING -> EMAIL_VERIFIED -> KYC_PENDING -> ...`) is collapsed to six because no existing field combination (and no code path) distinguishes "just verified email" from "verified but hasn't submitted KYC yet" - both are `emailVerified: true, verificationStatus: "draft"`. Per the phase's own "do not invent additional states" instruction, they're merged into one `KYC_PENDING` state.

```
EMAIL_PENDING --(OTP verify)--> KYC_PENDING --(submit)--> UNDER_REVIEW --(admin approve)--> APPROVED
                                                              |    \
                                                    (admin reject)  (admin request-resubmission)
                                                              |               |
                                                              v               v
                                                          REJECTED   RESUBMISSION_REQUIRED
                                                              |               |
                                                              +---(re-submit)-+
                                                                      |
                                                                      v
                                                                UNDER_REVIEW
```

### State transition table

| From | Event | To | Where enforced |
|---|---|---|---|
| (new account) | `POST /register`, or OAuth signup with unverified provider email | `EMAIL_PENDING` | schema default; OAuth create call |
| (new account) | OAuth signup with provider `email_verified: true` | `KYC_PENDING` | OAuth create call |
| `EMAIL_PENDING` | `POST /verify-email` (correct, unexpired OTP) | `KYC_PENDING` | `auth.routes.js`, same atomic `findOneAndUpdate` Phase 16A already used |
| `KYC_PENDING` | `POST /verification/submit` (all 4 docs uploaded) | `UNDER_REVIEW` | `verificationController.submitVerification` |
| `UNDER_REVIEW` | admin `POST .../approve` | `APPROVED` | `adminVerificationService.approveVerification`, same status-guarded `findOneAndUpdate` Phase 16B already used |
| `UNDER_REVIEW` | admin `POST .../reject` | `REJECTED` | `adminVerificationService.rejectVerification` |
| `UNDER_REVIEW` | admin `POST .../request-resubmission` | `RESUBMISSION_REQUIRED` | `adminVerificationService.requestResubmission` |
| `REJECTED` / `RESUBMISSION_REQUIRED` | re-upload + `POST /verification/submit` | `UNDER_REVIEW` | same `submitVerification` path - re-submission is not a separate code path |

**No new transition-guard code was needed.** `accountStatus` has no direct write path of its own - it is only ever set as a side effect of `emailVerified` or `verificationStatus` changing, and both of those already carry their own guards (Phase 16A's atomic single-use OTP consumption; Phase 16B's `assertPendingOrIdempotent`, which is *why* an admin can only decide on a genuinely-`pending` submission and can't skip straight from `RESUBMISSION_REQUIRED`/`REJECTED` to a new decision without a fresh submission in between). Every existing guard is inherited for free, including "rejecting an already-*approved* account is refused" (`assertPendingOrIdempotent` throws 409 unless the current state is `pending`).

`isActive`/`deletedAt` are **not** part of this state machine and never appear in `computeAccountStatus`. An account can be `accountStatus: "APPROVED"` and still fully blocked by `isActive: false` - suspension and verification progress are orthogonal by design (see `src/services/accountStatus.service.js`'s header comment for the full rationale).

### Login policy (preserved, not changed)

Login (`POST /login`, `authenticate` middleware, every authenticated route) is gated **only** on `isActive !== false` and `!deletedAt`. It is **not** gated on `emailVerified` or on `accountStatus`/`verificationStatus`. This was true before this phase and remains true - the phase brief explicitly allows preserving existing behavior here ("if the existing system intentionally allows login before KYC approval, preserve that"). `accountStatus` is exposed in `/me`, `/login`, `/register`, `/verify-email`, and `GET /verification` responses purely for the client to render the right UI state (verify-email banner, KYC prompt, "under review" notice, etc.) - it has no server-side access-control effect beyond what `emailVerified`/`verificationStatus`/`isActive` already independently enforce.

### Mass-assignment closure

Neither of the two "update my own profile" endpoints (`PUT /profile` -> `profileController.updateProfile`, `PUT /settings/profile` -> `settingsController.updateProfile` -> `settingsService.updateProfile`) can set `accountStatus` - both use an explicit field whitelist (`mapProfileInput`) that `accountStatus` is deliberately never added to. Regression-tested (`test/integration/accountStatus.test.js`).

### Migration

Adding a schema field with a `default` does **not** retroactively populate pre-existing MongoDB documents - only new documents get it at creation time. `scripts/backfillAccountStatus.js` derives and persists `accountStatus` for every existing user from their *current* `emailVerified`/`verificationStatus` values via the same `computeAccountStatus()` every live transition path uses. Idempotent and non-destructive: re-running only rewrites users whose derived value actually changed, and touches no other field.

```bash
node scripts/backfillAccountStatus.js
```

## Notes

- Handlers currently live inline in `auth.routes.js` rather than a dedicated `authController.js` — extraction is a Phase 3 roadmap item ([ROADMAP.md](../../ROADMAP.md)).
- The broken refresh-cookie-fallback-in-`authenticate`/`/me` bug this doc used to flag as unconfirmed has been fixed and is regression-tested (`test/integration/authAuthorization.test.js`: "GET /me rejects a refresh cookie presented with no Bearer header").
