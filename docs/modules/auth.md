# Module: Auth

Files: `src/routes/auth.routes.js`, `src/config/jwt.js`, `src/config/oauth.js`, `src/services/twoFactor.service.js`, `src/services/email.service.js`, `src/models/User.js`. See [SECURITY.md](../../SECURITY.md), [docs/AUTH_FLOW.md](../AUTH_FLOW.md), [ARCHITECTURE.md](../../ARCHITECTURE.md).

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

## Notes

- Handlers currently live inline in `auth.routes.js` rather than a dedicated `authController.js` — extraction is a Phase 3 roadmap item ([ROADMAP.md](../../ROADMAP.md)).
- The broken refresh-cookie-fallback-in-`authenticate`/`/me` bug this doc used to flag as unconfirmed has been fixed and is regression-tested (`test/integration/authAuthorization.test.js`: "GET /me rejects a refresh cookie presented with no Bearer header").
