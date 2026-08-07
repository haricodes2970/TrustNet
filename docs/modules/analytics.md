# Module: Analytics

Files: `src/routes/analytics.routes.js`, `src/controllers/analyticsController.js`, `src/services/analyticsService.js`. **No model file** — the first module with no domain entity of its own — and **no validators file** — every endpoint is a `GET` with no request body, so there's nothing for Joi to validate (`startupId` arrives as a required query param, checked in the service).

## Architecture

```
AnalyticsController → analyticsService → (Startup, Workspace, Project, Task, Milestone,
                                            Job, Application, InvestmentInterest,
                                            FundingRound, FundingContribution,
                                            ServiceListing, EngagementRequest, Team)
```

The first fully read-only module in this codebase — every route is `GET`, no create/update/delete anywhere. `analyticsService.js` reads existing collections directly via `find()`/`countDocuments()`/`aggregate()` rather than going through each domain's own service — there's no business logic to reuse for a pure count (`createTask`'s validation/authorization doesn't apply to counting existing tasks).

`resolveStartupAccess()` in `analyticsService.js` is a **sixth, deliberately duplicated** copy of the founder/admin/contributor role-computation logic already implemented separately in `workspaceService.resolveWorkspaceAccess()`, `jobService.resolveStartupAccess()`, `investmentInterestService.resolveStartupAccess()`, `fundingRoundService.resolveStartupAccess()`, and `engagementRequestService.resolveStartupAccess()`. Not shared with any of them by explicit instruction — none of those five files are touched here. See Architectural concerns.

## Permissions model

| Action | Owner | Admin | Contributor | Public / Unrelated |
|---|---|---|---|---|
| View any analytics endpoint for a Startup | ✓ | ✓ | ✓ | ✗ |

The simplest permission model of any module so far — a direct consequence of being fully read-only, there's no owner/admin-vs-contributor split to design. `assertAnyRole(startupId, userId)` is the single gate every endpoint shares: `ApiError(400, ...)` if `startupId` is missing, `ApiError(404, ...)` if the Startup doesn't exist, `ApiError(403, ...)` if the caller has no role at all. No public tier — analytics reveal internal counts (funding, hiring funnel, investor activity) that shouldn't be exposed the way a public job board or marketplace listing is.

## Data sources and aggregation strategy

Every metric is computed on demand from existing collections — no new writes, no persisted analytics document (see Database considerations). Concrete metric set:

- **Projects** (`GET /analytics/projects`): project count grouped by `status` (via the Startup's `Workspace`, if one exists), milestone count grouped by `status` (via that Workspace's `Project`s).
- **Tasks** (`GET /analytics/tasks`): task count grouped by `status`, plus a derived `completionRate = done / (total - archived)` as a percentage (0 when there are no non-archived tasks, not a division error).
- **Hiring** (`GET /analytics/hiring`): job count grouped by `status`, application count grouped by `status` (all seven states), plus a derived `conversionRate = hired / totalApplications` as a percentage.
- **Funding** (`GET /analytics/funding`): `Startup.fundingGoal`/`fundingRaised` read directly (no re-aggregation — `Funding` module already keeps `fundingRaised` correct via atomic `$inc`), round count grouped by `status`, contribution count grouped by `status` across all of that Startup's rounds.
- **Marketplace** (`GET /analytics/marketplace`): engagement request count grouped by `status`, distinct provider count engaged (resolved via `EngagementRequest → ServiceListing.provider`, since `EngagementRequest` doesn't denormalize the provider).
- **Investors**: distinct investor count and interest-count-by-status — computed but **only surfaced via `overview`**, no dedicated `/analytics/investors` endpoint exists (per the approved API design, which specifies six endpoints and does not include one for Investors).
- **Overview** (`GET /analytics/overview`): Startup identity fields (`name`/`stage`/`status`/`fundingGoal`/`fundingRaised`/`createdAt`/live team size) plus every section above in one payload.

`getOverview` calls each domain's internal `computeX(startupId)` function directly (bypassing the public `getXAnalytics(startupId, userId)` wrappers) after a single `assertAnyRole` check — avoiding six separate authorization round-trips for one `overview` request. This internal/public split (`computeProjectAnalytics` vs `getProjectAnalytics`) exists solely for this reason and is not exposed outside the module.

`defaultCounts(enumValues, groupResult)` (pure, unit-tested) converts a Mongo `$group` result into an object with every known enum value present and defaulted to `0` — so a Startup with zero activity in a domain returns real zeros, not a sparse or missing-key object.

## Fixed in the Analytics + Reports + AI hardening phase

**Critical: `computeHiringAnalytics`, `computeInvestorAnalytics`, and `computeMarketplaceAnalytics` returned zero for every real HTTP request, regardless of actual data.** `Model.aggregate()`'s `$match` stage does not get Mongoose's automatic string→ObjectId casting the way `.find()`/`.findOne()` does — these three functions built their `$match` against the raw `startupId` string every real request sends as `req.query.startupId`. Confirmed empirically: `Job.aggregate([{$match:{startup: startupIdString}}])` returns 0 documents against real seeded data; `Job.find({startup: startupIdString})` (identical string) correctly returns the same data `.find()` always did. Every pre-existing unit test called these service functions directly with `fx.startup._id` (already a real ObjectId from `Startup.create()`), so the production-only bug was never exercised — a textbook case of a correct-looking service-level test masking an HTTP-boundary type-coercion bug. `computeProjectAnalytics`/`computeTaskAnalytics` were already safe (their `$match` uses a real `Workspace` document's `_id`, fetched via `.findOne()` which does auto-cast); `computeFundingAnalytics` was already correct (takes the full `startup` object, not a bare id). Fixed by having every `getXAnalytics` wrapper — and `getOverview`'s internal calls — pass `startup._id` (the real ObjectId `assertAnyRole` already fetched) into every compute function, eliminating the entire bug class with one consistent convention rather than patching three functions individually. This transitively fixed the same bug for Reports and AI's `hiring-insights`/`marketplace-recommendations`/`analytics-interpretation` capabilities with zero changes needed in either file.

**A malformed `startupId` (not a 24-char hex string) threw a raw Mongoose `CastError`** with no `statusCode`, which `handleServiceError` passed through unchanged (it's a real `Error` with a message) and the controller's fallback turned into a `500`, leaking an internal Mongoose message for what is really a `400` bad request. Fixed in `assertAnyRole` — the single choke point every Analytics/Reports/AI call goes through — now returns `ApiError(400, "Invalid startupId.")`.

## Database considerations

**No new persistent model.** Every number is derivable from existing collections at query time; at this platform's current scale (a handful of Startups, modest per-domain document counts), per-Startup `countDocuments()`/`aggregate()` calls are cheap enough to compute on every request rather than cache.

**Explicitly deferred, not built:** a future `AnalyticsSnapshot`-style cache/rollup collection, once either query volume against these aggregates justifies caching, or a feature needs historical trend data (e.g. "funding raised over time") that reading current-state fields can't produce — `Startup.fundingRaised` only holds the current total, not a time series. Tracked in `BACKLOG.md`, not implemented.

## API

All six endpoints live under `/api/v1/analytics`, take `?startupId=` as a **required query parameter** (not a path parameter), and require authentication (`router.use(authenticate)` — no public tier):

| Method | Path | Returns |
|---|---|---|
| GET | `/analytics/overview` | Startup identity + team size + every section below in one payload |
| GET | `/analytics/projects` | project/milestone counts-by-status |
| GET | `/analytics/tasks` | task counts-by-status + completion rate |
| GET | `/analytics/hiring` | job/application counts-by-status + conversion rate |
| GET | `/analytics/funding` | `fundingGoal`/`fundingRaised` + round/contribution counts-by-status |
| GET | `/analytics/marketplace` | engagement request counts-by-status + distinct provider count |

Six endpoints rather than one giant response — lets a frontend dashboard fetch only the section it's rendering, same "don't force one bloated payload" reasoning that kept Applications' `/resume`/`/cover-letter` split from being a single generic update.

## Validation vs business rules

**Joi:** none — no request body on any endpoint. `startupId` presence/existence/authorization is all handled in `analyticsService.assertAnyRole`, not a validator, since it's a query param feeding an authorization check, not a body shape to validate.

**Business rules (service layer):** the only "rule" is authorization — does the caller have any role on the Startup. Every metric computation is a pure read; there is nothing to reject about reading a count.

## Error handling

Same convention established in Applications/Investors/Funding/Marketplace: `analyticsService` throws typed `ApiError(statusCode, message)`; `analyticsController` is pure pass-through. **First module with no 409 conflict class at all** — nothing is ever mutated, so there's nothing to conflict with.

- **400** — `startupId` query param missing.
- **403** — caller has no role on the Startup.
- **404** — `startupId` doesn't correspond to an existing Startup.

## Tests

**Unit** (`test/analytics.test.js`, 4 tests): `defaultCounts` (empty result defaults everything to 0, applies known counts, ignores an out-of-enum group entry), `assertAnyRole` rejecting a missing `startupId` with `ApiError` 400 (the one case testable without a database, since the check runs before any query).

**Integration** (`test/integration/analyticsAuthorization.test.js`, 13 tests, DB-backed, seeds one fully-populated Startup across every domain using each completed module's own service — `taskService`, `milestoneService`, `jobService`, `applicationService`, `investmentInterestService`, `fundingRoundService`, `fundingContributionService`, `providerProfileService`, `serviceListingService`, `engagementRequestService` — no new fixture, `createCollaborationFixture()`/`createStartupTeamFixture()` reused as-is):

- Authorization: owner/admin/contributor can access all six endpoints; unrelated user blocked (403) on all six; non-existent `startupId` → 404; missing `startupId` → 400.
- **Correctness against an exact known seed** — the first module where "the number is correct" is itself the primary thing under test: 3 tasks (2 `done`, 1 `todo`) → `completionRate: 66.67`; 2 applications (1 `submitted`, 1 `hired`) → `conversionRate: 50`; 1 confirmed (1000) + 1 pledged (2000) contribution → `fundingRaised: 1000`, `totalContributions: 2`; 1 published listing + 1 requested engagement → `distinctProviderCount: 1`.
- **Overview consistency** — asserts `overview.projects`/`tasks`/`hiring`/`funding`/`marketplace` deep-equal the corresponding dedicated endpoint's result for the same seeded state, proving no drift between the composed and standalone code paths.
- **Zero-state** — a Startup with no Workspace/Project, and separately a Startup with no jobs/funding/marketplace activity, both return real zero-valued objects, not errors or missing keys.

**New this phase** (`test/integration/analyticsReportsAiLifecycle.test.js`, shared with Reports/AI): HTTP-level regression coverage for the aggregate `$match` fix above — hiring/marketplace/overview analytics over a real request now report true counts, not the silent zero the bug produced — plus the malformed-`startupId` → clean 400 case.

Combined suite: **746/746 passing** (`npm run test:all`), **172/172 unit-only** (`npm test`), no regressions in any prior module.

## Architectural concerns discovered

- **Sixth duplication of Startup role-resolution logic** (`workspaceService`, `jobService`, `investmentInterestService`, `fundingRoundService`, `engagementRequestService`, now `analyticsService`). Deferred again per explicit instruction — tracked in `BACKLOG.md`. This is the strongest, most-repeated case across the entire codebase for the authorization-cleanup phase flagged after Investor, Funding, and Marketplace.
- **Cross-collection query cost.** `overview` alone touches up to ten collections in one request via `Promise.all`. Fine at current scale; if Analytics becomes a frequently-polled dashboard, the "no caching, compute every time" choice should be revisited — no load-testing precedent exists in this codebase to compare against, since nothing before this hammered this many collections per request.
- **No time-series/historical data.** Every metric reflects current state only. A genuinely trend-aware analytics product would need the `AnalyticsSnapshot`-style periodic-capture model deferred in Database considerations — not built this phase.
- **No admin/platform-wide analytics surface**, per your explicit decision — every metric is scoped to one Startup the caller has a role on. Cross-tenant reporting for the TrustNet admin role is a distinct, larger authorization question (admin sees *everything*, not "any role on one Startup") deliberately out of scope.
- **Time-to-hire and similar duration metrics were deliberately excluded**, not overlooked — computing them from `updatedAt` deltas on the current status alone (no status-history log exists in this codebase) would silently misrepresent reality for any job/application that changed status more than once.
- **`Model.aggregate()` does not auto-cast query-string ids to ObjectId, unlike `.find()`/`.findOne()`** — worth flagging for any future module reaching for a raw aggregation pipeline: always derive the id used in a `$match` stage from an already-fetched Mongoose document (e.g. `startup._id`), never from a route/query-param string directly, even though the exact same string works fine passed to `.find()`. This phase's critical bug (see above) is the concrete case study.
- **Investor metrics have no dedicated endpoint** — computed (`computeInvestorAnalytics`) but only surfaced via `overview`, per the approved six-endpoint API design, which specifies `projects`/`tasks`/`hiring`/`funding`/`marketplace` but not `investors`. If a dedicated `/analytics/investors` endpoint is wanted later, the compute function already exists and needs only a thin route/controller addition.
