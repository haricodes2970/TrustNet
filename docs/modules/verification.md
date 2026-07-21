# Module: Verification (KYC)

Files: `src/routes/verification.routes.js`, `src/controllers/verificationController.js`, `src/models/User.js` (`verificationDocuments`, `verificationStatus`), `src/services/cloudinary.service.js`. See [DATABASE.md](../../DATABASE.md#user-userjs), [admin.md](admin.md) (review side).

## Routes (`/api/v1/verification`) — all auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | get own verification state |
| POST | `/documents/:type` | upload a document (multer, type-filtered) |
| POST | `/submit` | submit for review |

## Controller (`verificationController.js`)

`getVerification`, `uploadDocument`, `submitVerification`.

## Document types

`type` enum on `User.verificationDocuments`: `government_id`, `company_registration`, `business_website`, `linkedin`, `startup_registration`. Each document carries `status` (draft/pending/approved/rejected) and `rejectionReason`.

## Flow

draft → pending (on submit) → approved/rejected (by admin, see [admin.md](admin.md)). `User.verificationStatus` gates [dashboard.md](dashboard.md) access via `requireApprovedVerification` middleware.
