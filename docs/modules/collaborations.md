# Module: Collaborations

Files: `src/routes/collaboration.routes.js`, `src/controllers/collaborationController.js`, `src/services/collaborationService.js`, `src/models/CollaborationRequest.js`. See [DATABASE.md](../../DATABASE.md#collaborationrequest-collaborationrequestjs).

## Routes (`/api/v1/collaborations`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | list collaboration requests |
| POST | `/request` | create request |
| GET | `/:id` | get one |
| PUT | `/:id` | update (status/response) |
| DELETE | `/:id` | delete |

## Controller (`collaborationController.js`)

`listCollaborationRequests`, `createCollaborationRequest`, `getCollaborationRequest`, `updateCollaborationRequest`, `deleteCollaborationRequest`.

## Service (`collaborationService.js`)

CRUD for collaboration requests.

## Model

`CollaborationRequest`: `sender`/`recipient` (User), optional `startup`, `type` enum (mentorship/funding/partnership/advisor/other), `subject`, `message`, `status` enum (pending/accepted/rejected/withdrawn), `responseMessage`, `isArchived`.

## Notes

TODO: confirm auth requirements per route directly in `collaboration.routes.js` — not fully enumerated in the initial survey.
