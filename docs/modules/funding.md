# Module: Funding

Files: `src/routes/fundingRound.routes.js`, `src/routes/fundingContribution.routes.js`, `src/controllers/fundingRoundController.js`, `src/controllers/fundingContributionController.js`, `src/services/fundingRoundService.js`, `src/services/fundingContributionService.js`, `src/validators/fundingRound.validators.js`, `src/validators/fundingContribution.validators.js`, `src/models/FundingRound.js`, `src/models/FundingContribution.js`. Two resources on the Startup domain, independent of Workspace/Project and independent of Investor (`InvestorProfile`/`InvestmentInterest`).

## Architecture

```
Startup 1---N FundingRound 1---N FundingContribution
```

`FundingContribution.investor` references `User` directly, not `InvestorProfile` — an investor need not hold a profile to contribute, same "no forced coupling" reasoning `InvestorProfile`/`InvestmentInterest` already established. `fundingRoundService.js` implements its own `resolveStartupAccess()`/`getAccessibleStartupIds()` — a **fourth, deliberately duplicated** copy of the founder/admin/contributor role-computation logic already implemented separately in `workspaceService.resolveWorkspaceAccess()`, `jobService.resolveStartupAccess()`, and `investmentInterestService.resolveStartupAccess()`. Not shared with any of them by explicit instruction — none of those three files are touched here. `fundingContributionService.js` reuses `fundingRoundService.getRoundById`/`resolveStartupAccess` (read-only) rather than re-deriving Startup access a fifth time within the Funding domain itself — same "reuse your immediate parent's service" pattern Application used against Job.

## Permissions model

**FundingRound**

| Action | Startup Owner/Admin | Contributor | Any authenticated user | Public |
|---|---|---|---|---|
| Create | ✓ | ✗ | ✗ | ✗ |
| Update (draft only) | ✓ | ✗ | ✗ | ✗ |
| Open / close / cancel | ✓ | ✗ | ✗ | ✗ |
| View | ✓ any state | ✓ any state (read-only) | — | ✓ if `open` and not archived |
| List | ✓ full roster with `?startupId=` | ✓ same | scoped to `open`-only | scoped to `open`-only |

**FundingContribution**

| Action | Investor (own) | Startup Owner/Admin | Contributor | Public |
|---|---|---|---|---|
| Pledge (create) | ✓ (any authenticated user, round must be `open`, currency must match, account must be active) | — | — | ✗ |
| View | ✓ own only | ✓ any for rounds they manage | ✓ read-only | ✗ |
| Confirm | ✗ | ✓ | ✗ | ✗ |
| Reject | ✗ | ✓ | ✗ | ✗ |
| Withdraw | ✓ own, `pledged` only | ✗ | ✗ | ✗ |
| List | ✓ own (default) | ✓ full roster with `?fundingRoundId=` filter | ✓ same | ✗ |

Contributor gets read-only access on both resources — same tier Investment Interest established, not Application's zero-access tier. **No public tier at all** on `funding-contributions` (`router.use(authenticate)` at the top of the route file); `funding-rounds` has a public tier for `open` rounds only, same "public when in the visible state" shape Job's public job-board tier established.

## View concealment (FundingRound only)

`getRoundForViewer` reuses `jobService.assertJobViewAccess`'s concealment convention: a round that is not `open` (or is archived) returns **404, not 403**, to anyone without a role on its Startup — including anonymous visitors, who get 404 outright rather than a prompt to authenticate. Existence itself is concealed, not just content. This is a deliberate, explicit reuse of Job's precedent, since `FundingRound` has the same "public when in one particular state" shape `Job` does — every other Funding/Investor endpoint (including `FundingContribution` entirely) keeps this repo's usual 403-on-no-access convention.

## List authorization — "scope, don't reject" / "downgrade to public subset"

- `listRoundsForUser` reuses `jobService.listJobsForUser`'s exact shape: an explicit `?startupId=` filter from a caller with no role on that startup silently downgrades to the `open`-and-non-archived subset rather than rejecting; no filter with no accessible startups does the same; a caller with accessible startups and no filter sees `open` rounds everywhere plus every state for their own startups (via `$or`).
- `listContributionsForUser` reuses Investment Interest's shape instead: an explicit `?fundingRoundId=` filter from a caller with no role on that round's startup scopes silently to `investor: userId`; no filter always scopes to `investor: userId`. No "downgrade to public subset" here since contributions have no public tier to downgrade to.

Both are regression-tested the same way every prior list-authorization bug class has been: an unrelated/unauthorized caller supplying the filter explicitly cannot see anyone else's data through it.

## Funding round lifecycle

```
draft → open → closed        (terminal)
  ↓        ↓
  └────────┴──→ cancelled     (terminal, owner/admin only, from draft or open)
```

`assertValidRoundTransition(currentStatus, nextStatus)` (pure, `fundingRoundService.js`, unit-tested) — a lookup-table implementation (`{draft: [open, cancelled], open: [closed, cancelled]}`) rather than a forward-path array, since the non-terminal path here is only two states deep, unlike Application/Investment-Interest's longer forward chains. `draft → open` additionally requires the parent Startup to have `status: "active"` (checked in `openRound`, not in the pure transition helper — the transition helper stays database-independent, same separation of concerns Investment-Interest's `active`-startup gate keeps in `createInterest` rather than in `assertValidInterestTransition`).

## Funding contribution lifecycle

```
pledged → confirmed   (terminal)
   ↓
   ├──→ rejected       (terminal, staff-only)
   └──→ withdrawn      (terminal, investor-only)
```

`assertValidContributionTransition(currentStatus, nextStatus)` (pure, `fundingContributionService.js`, unit-tested) — simpler than Investment Interest's 4-stage forward path: `pledged` is the only non-terminal state, so the helper only needs to check "is current already terminal" and "is next one of the three valid terminal destinations." Deliberately not shared with `assertValidRoundTransition` or any other module's transition helper, per the project's standing "structurally similar but deliberately not shared" convention (`canMutateDocument`/`canMutateTask` precedent, extended through Investment Interest, now here).

## Funding totals — the required architectural decision

On `pledged → confirmed`, `confirmContribution` performs three separate atomic operations, in this order:

1. `FundingContribution.findOneAndUpdate({ _id: id, status: "pledged" }, { status: "confirmed", ... })` — the `status: "pledged"` filter is itself the concurrency guard. Under a concurrent double-confirm race, only one caller's update matches and returns a document; the loser gets `null` back and the function throws `ApiError(409, "...no longer pledged...")` — no read-modify-write anywhere in this step.
2. `FundingRound.updateOne({ _id: round._id }, { $inc: { raisedAmount: existing.amount } })` — atomic increment, never a read-then-write.
3. `Startup.updateOne({ _id: round.startup }, { $inc: { fundingRaised: existing.amount } })` — atomic increment, never a read-then-write.

`FundingRound.raisedAmount` tracks that round's own confirmed total; `Startup.fundingRaised` (a pre-existing field on the `Startup` model, previously unused by any service) now aggregates across **all** of that Startup's rounds — the first module to write to a `Startup` field it doesn't otherwise own. `Startup.fundingGoal` is left untouched — it stays a Startup-level, founder-declared figure, not derived from any round's `targetAmount`.

`pledged`, `rejected`, and `withdrawn` states never touch either total — verified explicitly in integration tests (see Tests, below).

**Known limitation, accepted for this phase:** steps 2 and 3 are not wrapped in a multi-document transaction. If the process crashes between steps 1 and 3, the contribution could end up `confirmed` with one or both totals not yet incremented. MongoDB multi-document transactions require a replica set, which `mongodb-memory-server`'s default single-node setup does not provide, and no transaction infrastructure exists elsewhere in this codebase. Flagged as a compensating gap, not resolved here — see Architectural risks.

## Models

**FundingRound**: `startup` (ref Startup, required, indexed — only relationship), `title`, `roundType` enum, `targetAmount` (required, min 0), `raisedAmount` (default 0, maintained exclusively via `$inc`, never a direct write from `updateRound`), `currency` enum (reuses the same list `Startup.currency`/`Job.currency` already use), `minimumContribution` (optional, business-rule input only, not enforced by schema), `status` enum (`draft/open/closed/cancelled`, default `draft`, indexed), `openedAt`/`closedAt` (set by the service on transition), `description`, `createdBy`/`updatedBy` (audit only), `isArchived` (default false — present on the schema per approved design, but no dedicated archive endpoint was requested this phase; only participates today in `getRoundForViewer`'s public-visibility check and `listRoundsForUser`'s downgrade filter).

**FundingContribution**: `fundingRound` (ref FundingRound, required, indexed), `investor` (ref User, required, indexed — not assumed to hold an `InvestorProfile`), `amount` (required, min 0.01), `currency` enum (validated against the parent round's currency at the service layer, not the schema layer — a cross-document rule Joi/Mongoose can't express alone), `status` enum (`pledged/confirmed/rejected/withdrawn`, default `pledged`, indexed), `note`, `createdBy`/`updatedBy` (audit only).

**No partial unique index** — unlike `InvestmentInterest`/`Application`, an investor may hold multiple concurrent pledges to the same round (e.g. topping up); a `{fundingRound, investor}` uniqueness constraint would be actively wrong here, not merely unnecessary. Deliberate schema divergence from the two most recently completed modules, called out explicitly so it isn't read as an oversight.

## API

**`/api/v1/funding-rounds`**

| Method | Path | Access |
|---|---|---|
| POST | `/` | Startup owner/admin |
| GET | `/` | scoped, see above |
| GET | `/:id` | owner/admin/contributor any state; everyone else only if `open` (404 concealment otherwise) |
| PUT | `/:id` | owner/admin, `draft` only |
| PUT | `/:id/open` | owner/admin, startup must be `active` |
| PUT | `/:id/close` | owner/admin |
| PUT | `/:id/cancel` | owner/admin |

**`/api/v1/funding-contributions`**

| Method | Path | Access |
|---|---|---|
| POST | `/` | any authenticated user, target round must be `open`, currency must match |
| GET | `/` | scoped per caller |
| GET | `/:id` | investor (own) or round's startup owner/admin/contributor |
| PUT | `/:id/confirm` | startup owner/admin — atomically increments totals |
| PUT | `/:id/reject` | startup owner/admin |
| PUT | `/:id/withdraw` | investor only, `pledged` only |

Dedicated `/confirm`/`/reject` endpoints rather than a single `PUT /:id/status`, per instruction — `confirm` carries a side effect (`$inc` on two other documents) `reject` does not, an asymmetry a single status endpoint would obscure. Same reasoning already applied to Application's dedicated `/resume`/`/cover-letter` split and Investment Interest's dedicated `/status`/`/withdraw` split, extended one step further here since even the two staff-facing verbs (`confirm`/`reject`) now diverge from each other.

## Validation vs business rules

`fundingRound.validators.js`/`fundingContribution.validators.js` (Joi): shape/type/enum/range only — `fundingRoundCreate` (`startupId`/`title`/`roundType`/`targetAmount` required, `currency`/`minimumContribution`/`description` optional), `fundingRoundUpdate` (all fields optional, **no `status` field** — status changes only via the dedicated transition endpoints, same convention `jobUpdate` established), `fundingContributionCreate` (`fundingRoundId`/`amount`/`currency` required, `amount` must be `> 0`).

**Business rules (service layer):** round creation requires the target Startup to exist (404 otherwise); `draft → open` requires the Startup to be `active`; contribution creation requires the round to be `open` and non-archived, and the contribution's `currency` to match the round's `currency`; the acting investor's own `User.isActive` must be true; all state-machine legality; all authorization; funding-total increments strictly on the `confirmed` transition, via atomic `$inc` only.

## Error handling

Same convention established in Applications/Investors: services throw typed `ApiError(statusCode, message)`; both controllers are pure pass-through (`try { ...call service... } catch (error) { const status = error instanceof ApiError ? error.statusCode : 500; ... }`) — no per-route hardcoded status, no business/authorization logic in the controller layer.

- **400** — malformed input, rejected by Joi validators before reaching a service.
- **403** — authorization failure: insufficient Startup role, ownership mismatch on withdraw, or the acting investor's own account being inactive.
- **404** — resource not found (startup, funding round, contribution); also used deliberately for `FundingRound`'s view-concealment case (see above) instead of 403.
- **409** — state conflict: startup not active on open, round not open (or currency mismatch) on pledge, terminal-state block, invalid transition, lost confirm/reject/withdraw race (the `findOneAndUpdate({status:"pledged"})` guard losing).

## Tests

**Unit** (`test/fundingRound.test.js`, 10 tests; `test/fundingContribution.test.js`, 8 tests): Joi validators, `assertValidRoundTransition` (all valid transitions, skip-ahead rejection, terminal-state immutability, `ApiError`/statusCode shape), `assertValidContributionTransition` (same coverage).

**Integration** (`test/integration/fundingAuthorization.test.js`, DB-backed via `mongodb-memory-server`, reuses `createStartupTeamFixture()` — no new fixture, same independence-from-Workspace/Project proof Hiring/Investor already established): round create/draft-edit-gate/contributor-read-only/unrelated-blocked; full lifecycle (open requires active startup, close, cancel from draft and from open, terminal-state block); view concealment (404 for non-open + no role, including anonymous) vs public visibility when `open`; list-filter regression (unauthorized downgraded, authorized full roster including drafts); contribution pledge (round-not-open gate, currency-mismatch gate, inactive-account gate, multiple-pledges-allowed); view (investor own, contributor read-only, unrelated blocked with 403); list-filter regression (own-only vs full roster); confirm/reject/withdraw lifecycle including terminal-state blocks on both confirm-twice and withdraw-after-confirm; contributor blocked from confirm/reject; and a **dedicated funding-totals verification block**: single-confirm increments both `FundingRound.raisedAmount` and `Startup.fundingRaised` by the exact amount, multiple confirmed contributions produce the correct cumulative total on both documents, and `pledged`/`rejected`/`withdrawn` contributions leave both totals untouched.

Combined suite: **299/299 passing** (`npm run test:all`), **104/104 unit-only** (`npm test`), no regressions in any pre-existing module (Investor's 235/235 and every earlier module's count carried forward unchanged).

## Architectural risks and trade-offs

- **Fourth duplication of Startup role-resolution logic** (`workspaceService`, `jobService`, `investmentInterestService`, now `fundingRoundService`). Tracked in `BACKLOG.md` per instruction — this is now the strongest, most-repeated case for the dedicated authorization-cleanup phase already flagged after Investor; recommend that phase be scheduled soon rather than deferred a fifth time.
- **No multi-document transaction around the totals update** (see Funding totals, above) — a crash between the contribution-status write and either `$inc` could leave state inconsistent. Not resolved this phase (no transaction infrastructure exists in this codebase, and the test environment's single-node `mongodb-memory-server` can't exercise real replica-set transactions anyway); flagged in `BACKLOG.md` as a production-readiness gap, not a bug found in testing.
- **`Startup.fundingRaised` is now owned in practice by the Funding module**, despite living on the `Startup` schema, which Funding does not otherwise touch or import for writes anywhere else. First cross-module field-ownership case in this codebase. `Startup.fundingGoal` deliberately remains untouched/founder-declared.
- **`Job`'s/`FundingRound`'s public-visibility routes both rely on `req.user` being set on unauthenticated route paths for the "authenticated caller sees more" branch to activate** — but no optional-auth middleware exists in this codebase (`src/middlewares/auth.js` only exports a hard-`authenticate`, which 401s if no token is present). This means the `listRoundsForUser`/`getRoundForViewer` branches that check "does this authenticated caller have a role on this startup" are unreachable in production on the public GET routes today, same **pre-existing** limitation Job already has — not introduced by Funding, but now affecting a second module. Flagged in `BACKLOG.md`.
- **No `?fundingRoundId=` cross-round aggregate listing** ("all contributions across every round I manage") — same deliberate scope limit Applications chose for jobs; staff must supply the filter explicitly per round.
