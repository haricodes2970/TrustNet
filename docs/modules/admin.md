# Module: Admin

Files: `src/routes/admin.routes.js`, `src/controllers/adminVerificationController.js`, `src/services/adminVerificationService.js`, `src/middlewares/authorize.js`. Review side of [verification.md](verification.md).

## Routes (`/api/v1/admin`) — auth + `admin` role required

| Method | Path | Purpose |
|---|---|---|
| GET | `/me` | get own admin identity |
| GET | `/verifications` | list pending/all verifications |
| GET | `/verifications/:userId` | get one user's verification |
| POST | `/verifications/:userId/approve` | approve verification |
| POST | `/verifications/:userId/reject` | reject verification |

## Controller (`adminVerificationController.js`)

`getMe`, `listVerifications`, `getVerification`, `approveVerification`, `rejectVerification`.

## Service (`adminVerificationService.js`)

List verifications, approve, reject.

## Access control

Gated by `authorize('admin')`. Self-assignment of the `admin` role is explicitly blocked (commit `cbe98e3 fix(security): prevent self-assignment of admin role`) — see [SECURITY.md](../../SECURITY.md#role-based-access).

## Notes

Scope of admin moderation beyond verification (e.g. user ban, content moderation) is an open question — see [ROADMAP.md](../../ROADMAP.md#open-questions-from-backlog-appendix-b).
