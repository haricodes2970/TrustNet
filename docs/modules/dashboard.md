# Module: Dashboard

Files: `src/routes/dashboard.routes.js`, `src/controllers/dashboardController.js`, `src/services/dashboardService.js`, `src/middlewares/verification.js`.

## Routes (`/api/v1/dashboard`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | required + `requireApprovedVerification` | aggregate dashboard data |

## Controller / Service

`dashboardController.js`: `getDashboard`. `dashboardService.js`: aggregates dashboard metrics, including recent-startups and trending-posts widgets (commits `c5a41d7`, `1a9c68f`).

## Access gate

Requires `User.verificationStatus === "approved"` via `requireApprovedVerification` middleware — see [verification.md](verification.md), [SECURITY.md](../../SECURITY.md#verification-kyc-gate).

## Notes

Auto-creation of a dashboard user on missing-user lookups was removed (commit `5909ade fix(dashboard): remove dashboard auto user creation`) — do not reintroduce implicit user creation here; see [BACKLOG.md](../../BACKLOG.md) for the wider `resolveUser` policy question.
