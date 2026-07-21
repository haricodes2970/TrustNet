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
| GET | `/verify-email` | — | verify email token (stub) |
| POST | `/resend-verification` | — | resend verification email (stub) |
| POST | `/forgot-password` | — | send password reset email |
| POST | `/reset-password` | — | reset password with token |
| PUT | `/change-password` | required | change password |

## Model fields used

`User`: `password`, `resetPasswordToken`, `resetPasswordExpires`, `twoFactorEnabled`, `twoFactorSecret`, `twoFactorPendingSecret`, `googleId`, `linkedinId`, `email`. See [DATABASE.md](../../DATABASE.md#user-userjs).

## Notes

- Handlers currently live inline in `auth.routes.js` rather than a dedicated `authController.js` — extraction is a Phase 3 roadmap item ([ROADMAP.md](../../ROADMAP.md)).
- `/verify-email` and `/resend-verification` are stubs — no real email-verification flow confirmed wired end-to-end. TODO: verify against current code before documenting as functional.
- Refresh-token secret verification bug flagged in [SECURITY.md](../../SECURITY.md) — confirm status before relying on `/refresh`.
