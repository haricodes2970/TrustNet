# Module: Investors

Files: `src/routes/investor.routes.js`, `src/routes/investmentInterest.routes.js`, `src/controllers/investorController.js`, `src/controllers/investmentInterestController.js`, `src/services/investorService.js`, `src/services/investmentInterestService.js`, `src/validators/investor.validators.js`, `src/validators/investmentInterest.validators.js`, `src/models/InvestorProfile.js`, `src/models/InvestmentInterest.js`. Two independent resources, not nested under Workspace/Project or under Hiring.

## Architecture

```
User ---- InvestorProfile (1:1, any authenticated user, public directory)
User (investor) ---- InvestmentInterest ---- Startup
```

`InvestorProfile` has zero Startup relationship — a pure User-owned resource, list/get are public. `InvestmentInterest` is where Startup authority lives, resolved by `investmentInterestService.js`'s own `resolveStartupAccess()` — a **third, deliberately duplicated** copy of the founder/admin/contributor role-computation logic already implemented separately in `workspaceService.resolveWorkspaceAccess()` and `jobService.resolveStartupAccess()`. Not shared with either by explicit instruction — `workspaceService.js` and `jobService.js` are both left untouched. See Architectural concerns below.

## Permissions model

**InvestorProfile**

| Action | Owner | Any other user | Public |
|---|---|---|---|
| Create own profile | ✓ (one per user) | — | ✗ (auth required) |
| List / view | ✓ | ✓ | ✓ |
| Update | ✓ own only | ✗ | ✗ |

**InvestmentInterest**

| Action | Investor (`interest.investor`) | Startup Owner/Admin | Contributor | Public |
|---|---|---|---|---|
| Express interest | ✓ (any authenticated user, active account, target startup `active`) | — | — | ✗ |
| View | ✓ own only | ✓ any for startups they manage | ✓ read-only, for startups they belong to | ✗ |
| List | ✓ own (default, no filter) | ✓ full roster with explicit `?startupId=` filter | ✓ full roster with explicit `?startupId=` filter | ✗ |
| Update status | ✗ | ✓ | ✗ | ✗ |
| Archive | ✗ | ✓ | ✗ | ✗ |
| Withdraw | ✓ own, from any non-terminal state | ✗ | ✗ | ✗ |

**Contributor gets read access here — the deliberate divergence from Applications**, where contributor gets zero access to a single application. Investment interest is lower-stakes/less sensitive than a job application, so Startup team visibility was extended to the full team, not just owner/admin. **No public tier at all** on `investment-interests` (`router.use(authenticate)` at the top of the route file) — unlike `investor.routes.js`, which is public for list/get, and unlike `job.routes.js`.

## List authorization — "scope, don't reject"

`listInterestsForUser` never has an explicit 403 branch for the list case — same pattern as Applications/Tasks/Projects:

- Explicit `?startupId=` filter, caller has any role (owner/admin/contributor) on that startup → sees the full roster for that startup.
- Explicit `?startupId=` filter, caller has no role → silently scoped to `investor: userId` (their own interest for that startup, if any).
- No filter → always scoped to `investor: userId`.

Regression-tested the same way Project/Task/Job/Application were: an unrelated user supplying `?startupId=` cannot see anyone else's interests via the filter.

## Investment interest lifecycle

```
submitted → reviewing → contacted → accepted   (terminal)
   ↓            ↓            ↓
   └────────────┴────────────┴──→ declined   (terminal, staff-only, from any non-terminal state)
   (any non-terminal state) → withdrawn      (terminal, investor-only)
```

`assertValidInterestTransition(currentStatus, nextStatus)` (pure, `investmentInterestService.js`, unit-tested) — same shape as `applicationService.assertValidStatusTransition`, kept as a separate function per the project's standing "structurally similar but deliberately not shared" convention (`canMutateDocument`/`canMutateTask` precedent). Terminal states permit no further transition; `declined` reachable from any non-terminal state; every other transition must be exactly one forward step (no skip-ahead). `withdrawn` reachable only via the dedicated withdraw endpoint — the status validator's staff-settable enum excludes both `submitted` and `withdrawn`.

## Models

**InvestorProfile**: `user` (ref `User`, required, unique — one profile per user), `organization`, `investmentThesis`, `preferredStages` (reuses `Startup.stage`'s own enum, no parallel enum invented), `preferredIndustries[]`, `preferredRegions[]`, `createdBy`/`updatedBy` (audit only). **No `verificationStatus` field** — deliberately reuses `User.verificationStatus` (the existing KYC system) instead of a duplicated concept.

**InvestmentInterest**: `investor` (ref `User`, required, indexed), `startup` (ref `Startup`, required, indexed), `message`, `status` enum (`submitted`/`reviewing`/`contacted`/`accepted`/`declined`/`withdrawn`, default `submitted`, indexed), `isArchived` (default `false`), `createdBy`/`updatedBy` (audit only).

**Partial unique index:** `{ startup: 1, investor: 1 }`, `partialFilterExpression: { status: { $ne: "withdrawn" } }` — blocks a concurrent duplicate *active* interest at the DB layer, same pattern as `Application`'s `{ job, applicant }` index, while still permitting re-expression after withdrawal. `createInterest` runs an app-level pre-check for a friendlier error, and catches Mongo's `code === 11000` as the race-condition backstop.

## API

**`/api/v1/investors`**

| Method | Path | Access |
|---|---|---|
| POST | `/` | any authenticated user (one profile per user) |
| GET | `/` | public |
| GET | `/:id` | public |
| PUT | `/:id` | owner only |

**`/api/v1/investment-interests`**

| Method | Path | Access |
|---|---|---|
| POST | `/` | any authenticated user, target startup must be `active` |
| GET | `/` | scoped per caller, see above |
| GET | `/:id` | investor (own) or startup owner/admin/contributor |
| PUT | `/:id/status` | startup owner/admin only |
| DELETE | `/:id` | startup owner/admin only (archive, not hard delete) |
| PUT | `/:id/withdraw` | investor only |

## Validation vs business rules

`investor.validators.js` / `investmentInterest.validators.js` (Joi): shape/type/enum/length only — `investorProfileCreate`/`investorProfileUpdate` (all fields optional, `preferredStages` restricted to `Startup`'s stage enum), `investmentInterestCreate` (`startupId` required), `statusUpdate` (`status` restricted to the staff-settable subset: `reviewing`/`contacted`/`accepted`/`declined` — excludes `submitted` and `withdrawn`).

**Business rules (service layer):** profile uniqueness (one per user); target startup must have `status: "active"` to accept new interest; acting user's own `User.isActive` must be true; duplicate-active-interest prevention (app-level + DB partial unique index); status transitions gated by `assertValidInterestTransition`; all authorization (ownership, startup role).

## Error handling

Services throw typed `ApiError(statusCode, message)` (`src/utils/ApiError.js`), matching the convention already used by `applicationController`/`documentController`/`teamController`/`workspaceController`/`taskController`/`milestoneController`/`projectController`/`startupController`. Both controllers are pure pass-through: `try { ...call service... } catch (error) { const status = error instanceof ApiError ? error.statusCode : 500; ... }` — no per-route hardcoded status guessing, no business/authorization logic in the controller layer.

Status-code convention for this module:

- **400** — malformed input, rejected by Joi validators before reaching a service (services do not throw 400 themselves in this module).
- **403** — authorization failure: ownership mismatch (`assertOwner(..., 403)`), insufficient startup role, or the acting investor's own account being inactive.
- **404** — resource not found (startup, investor profile, investment interest).
- **409** — state conflict: duplicate profile, duplicate active interest, startup not currently accepting interest, terminal-state block, invalid status transition.

## Tests

**Unit** (`test/investor.test.js`, 3 tests; `test/investmentInterest.test.js`, 7 tests): Joi validators, `assertValidInterestTransition` (happy path, skip-ahead rejection, reject-from-any-non-terminal, terminal-state immutability).

**Integration** (`test/integration/investorAuthorization.test.js`, 29 tests, DB-backed via `mongodb-memory-server`, reuses `createStartupTeamFixture()` — no new fixture needed, proves independence from Workspace/Project the same way Hiring did): profile create/duplicate-block/public-read/owner-update/non-owner-block; interest create/active-startup-gate/inactive-user-gate; investor view-own/block-other/withdraw/withdraw-terminal-block; owner+admin status update/skip-block/archive; contributor read-only (view yes, status/archive no); unrelated user fully blocked; duplicate-active-block + re-express-after-withdrawal; list-filter regression (unauthorized scoped, authorized full roster); and a dedicated ApiError status-code contract block (409/404/403 cases) verifying `error instanceof ApiError && error.statusCode === <expected>` for the representative failure of each category.

Combined suite: 235/235 passing (`npm run test:all`), 82/82 unit-only (`npm test`), no regressions in any pre-existing module.

## Architectural concerns discovered

- **Third distinct duplication of Startup role-resolution logic** (`workspaceService.resolveWorkspaceAccess`, `jobService.resolveStartupAccess`, now `investmentInterestService.resolveStartupAccess`). Explicit, instructed decision for this phase — see `BACKLOG.md` for the standing note. This is now the clearest, most-repeated case for a future dedicated authorization-cleanup phase, to run only once additional Startup-domain modules exist.
- **`InvestorProfile` and `InvestmentInterest` have no relationship to each other.** An investor can express interest without ever creating a profile — intentional (interest is User-driven, not Profile-driven), not an oversight, but worth confirming against product intent if a future phase wants to gate interest-expression on having a profile.
- **Contributor tier now has three different shapes across three modules**: Task (conditional read-write, own-created/own-assigned only), Application (zero access), Investment Interest (unconditional read-only). Each individually justified in its own module doc; nothing centrally documents the full comparison — worth a future BACKLOG.md-level note if a fourth shape appears.
- **No rate limiting / enumeration protection** on the public `GET /investors` directory — same standing gap already flagged for Job's public surface in `BACKLOG.md`.
