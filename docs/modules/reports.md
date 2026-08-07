# Module: Reports

Files: `src/routes/report.routes.js`, `src/controllers/reportController.js`, `src/services/reportService.js`. No model file, no validators file — same reasoning as [analytics.md](analytics.md): no domain entity, no request body on the one `GET` route.

## Architecture

```
ReportController → reportService → analyticsService (reused, not duplicated) → domain models
```

**A presentation/export layer over Analytics, nothing more.** `reportService.js` never queries a domain model directly — every report type dispatches to an existing `analyticsService` function (`getOverview`, `getProjectAnalytics`, `getTaskAnalytics`, `getHiringAnalytics`, `getFundingAnalytics`, `getMarketplaceAnalytics`). Reports adds exactly two things Analytics doesn't have: export-format serialization (JSON passthrough, hand-rolled CSV — see Export formats) and a thin envelope (`reportType`/`startupId`/`generatedAt`) wrapped around whatever Analytics returns.

**Authorization is reused, not re-implemented — no seventh `resolveStartupAccess()`.** `reportService.js` imports `analyticsService.resolveStartupAccess` and `analyticsService.assertAnyRole` directly. Reports is explicitly an extension of Analytics, not a new Startup-authority domain, per instruction — the only new authorization code in this module is `assertOwnerOrAdmin()`, a thin wrapper that calls `assertAnyRole` (handles the 400/404/403-no-role cases, already correct) and then narrows the confirmed role down to owner/admin only.

## Domain relationships

None of its own. Reports depends entirely on Analytics' existing relationship graph — if `analyticsService`'s aggregation changes, Reports inherits the change automatically. A deliberate coupling: duplicating the aggregation here would be exactly the kind of divergence the "reuse Analytics" instruction was meant to prevent.

## Permission model

**Deliberately stricter than Analytics — a considered divergence, not an oversight:**

| Action | Owner | Admin | Contributor | Public / Unrelated |
|---|---|---|---|---|
| Generate/export any report (any format) | ✓ | ✓ | ✗ (403) | ✗ (403) |

Reports are exportable/downloadable — a materially higher exfiltration risk than an in-app `GET` response — so contributor is excluded here even though the exact same underlying data is contributor-readable via `/analytics/*`. Directly tested: a contributor is denied every report type, and a separate test confirms that same contributor can still call `analyticsService.getTaskAnalytics` successfully — proving the divergence is a deliberate policy choice in `reportService`, not a shared authorization bug.

## API

**`GET /api/v1/reports/:reportType`** — one route, not six. `:reportType` is a path param restricted to `startup`/`projects`/`tasks`/`hiring`/`funding`/`marketplace` (a lookup table, `ApiError(400, ...)` on an unrecognized value); query params `startupId` (required) and `format` (`json` default, or `csv`). Every route requires authentication (`router.use(authenticate)`) — no public tier.

**Response shape diverges by `format` — the first departure from the uniform `{ success, data }` envelope in this codebase:**

- `format=json` (default): normal envelope, `data` is the report object (`{ reportType, startupId, generatedAt, data: <analytics payload> }`).
- `format=csv`: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="<reportType>-report.csv"`, raw CSV body, no JSON wrapper — a file-download response can't be JSON-enveloped and still work as a browser/curl download.

## Report generation strategy

On-demand, computed fresh per request — no persistence, no new model, per constraint. A single dispatch table (`REPORT_GENERATORS`) maps each of the six `reportType` values directly onto the corresponding `analyticsService` function reference — no per-report-type branching logic beyond that lookup.

## Export formats

**JSON** — the report envelope returned as-is; zero new serialization work beyond adding `reportType`/`startupId`/`generatedAt`.

**CSV** — hand-rolled, no new dependency. Three pure, unit-tested functions in `reportService.js`:

- `flattenToRows(value, prefix)` — recursively flattens the nested report object into `[dotted.key, scalarValue]` pairs (e.g. `data.tasksByStatus.done`). Works identically across all six report shapes without a report-type-specific serializer, since every Analytics payload is the same underlying shape (scalars plus one or more `xByStatus` count maps). `Date` values are converted to ISO strings during flattening.
- `escapeCsvField(value)` — RFC 4180 field escaping: wraps in quotes (doubling any embedded quotes) whenever the value contains a comma, quote, or newline; renders `null`/`undefined` as an empty string.
- `toCsv(report)` — combines the two into a `metric,value` header plus one row per flattened field, CRLF line endings.

**PDF is explicitly NOT implemented this phase**, per instruction — see Architectural concerns and `BACKLOG.md` for the two realistic library options and the tradeoff between them.

## Validation vs business rules

**Joi:** none — no request body, same reasoning as Analytics. `reportType` and `format` are closed enums checked inside `reportService.generateReport` (both checked *before* any authorization/DB work — an invalid `reportType` or `format` fails fast with `ApiError(400)` without ever looking up the Startup or the caller's role, directly tested).

**Business rules (service layer):** `reportType` must be one of the six known values; `format` must be `json` or `csv`; `startupId` required/must exist/caller must be owner or admin (via `assertOwnerOrAdmin`, itself built on `assertAnyRole`'s existing 400/404/403 handling).

## Fixed in the Analytics + Reports + AI hardening phase

**No audit logging existed at all**, despite being an explicit requirement for this module specifically (not Analytics or AI — reports are exportable/downloadable, a materially higher exfiltration risk than an in-app read, the same reasoning that already justifies this module's stricter owner/admin-only gate). `reportController.js` now logs a `report.generate` entry (`{reportType, format}`) via `auditLogService` on every successful generation. Logged only on success — a failed/unauthorized attempt is already visible via the 403/404 response itself, and logging it too would let an unrelated caller probe for a startup's existence via the audit trail. `startupId` stands in as the audit entry's target (Reports has no single persisted document to key one on — it's a computed export, not a resource), the same "closest equivalent" reasoning used for Notification's `markAllRead` bulk action in an earlier phase.

**Inherited the Analytics aggregate `$match` fix transitively** — every `reportType` dispatches straight to an `analyticsService` function, so `hiring`/`marketplace` reports (and the `startup` overview report's hiring/marketplace/investor sections) were affected by the same silent-zero bug and are now fixed with zero changes to `reportService.js` itself. See [analytics.md](analytics.md) for the root cause.

## Error handling

Same convention as every prior module: `reportService` throws typed `ApiError`; `reportController` is pure pass-through except for the CSV response-shape branch described above. No 409 — same as Analytics, nothing here is ever mutated.

- **400** — invalid `reportType`, invalid `format`, or missing `startupId`.
- **403** — caller has no role at all on the Startup, or has a role below owner/admin (contributor).
- **404** — `startupId` doesn't correspond to an existing Startup.

## Tests

**Unit** (`test/report.test.js`, 9 tests): `escapeCsvField` (plain value, comma, embedded quotes, newline, null/undefined), `flattenToRows` (nested-object flattening, `Date` → ISO string), `toCsv` (header + rows, comma-escaping end-to-end).

**Integration** (`test/integration/reportAuthorization.test.js`, 14 tests, DB-backed, reuses `createCollaborationFixture()` plus `taskService` to seed a small known dataset — no new fixture, and deliberately a lighter seed than Analytics' own test file since Reports' tests verify passthrough/formatting/authorization, not aggregation correctness, which is already Analytics' responsibility):

- Authorization: owner and admin can generate all six report types; **contributor denied (403) on all six** — the one behavior that must diverge from Analytics' already-passing any-role tests, with a companion test proving the same contributor *can* still call `analyticsService` directly (confirms the divergence lives in `reportService`, not a shared bug); unrelated user denied (403).
- Correctness: `format=json`'s `data` field deep-equals calling the corresponding `analyticsService` function directly, for both a per-domain report (`tasks`) and the composite report (`startup`/overview) — proves no drift between Reports' passthrough and Analytics' own output.
- Envelope: `reportType`/`startupId` echo the request; `generatedAt` falls within the test's own before/after timestamp bounds.
- CSV: end-to-end `format=csv` output contains the expected flattened fields (`data.totalTasks,2`, `data.tasksByStatus.done,1`); a startup name containing a comma is correctly quoted in the CSV output (`data.startup.name,"Acme, Inc."`).
- Validation: invalid `reportType` → 400 (checked *before* any DB/authorization work, directly tested); invalid `format` → 400; missing `startupId` → 400; non-existent `startupId` → 404.

**New this phase** (`test/integration/analyticsReportsAiLifecycle.test.js`, shared with Analytics/AI): JSON/CSV export shape and headers over real HTTP, owner/admin-vs-contributor gate, audit log integration, empty-dataset zero-valued correctness, invalid report type.

Combined suite: **746/746 passing** (`npm run test:all`), **172/172 unit-only** (`npm test`), no regressions in any prior module.

## Architectural concerns discovered

- **PDF support is deliberately deferred, not silently dropped.** Recorded in `BACKLOG.md` with the two realistic implementation options (`pdfkit` — lighter, no Chromium dependency, more manual layout code; Puppeteer — heavier, can reuse HTML/CSS templates for layout) and the tradeoff between them, per instruction — no library was added to `package.json` this phase.
- **First response-shape exception in this codebase.** `format=csv` bypasses the `{success,data}` envelope entirely — a well-precedented pattern for file-download endpoints generally, but a genuine first here, worth knowing if a future module needs a similar file-download response.
- **Reports' correctness now depends entirely on Analytics' correctness**, not its own queries — a bug in `analyticsService`'s aggregation propagates into every exported report automatically. This is the intended benefit of reuse (fix once, both surfaces correct), but it does mean Reports' own test suite only verifies "did I package Analytics' output correctly," never "is the underlying count right" — that verification already exists in `analyticsAuthorization.test.js` and isn't duplicated here.
- **Owner/admin-only (contributor excluded) is the first time this codebase draws that particular line for a read action rather than a write action** — every other read-oriented module (Investment Interest, Funding, Marketplace, Analytics itself) gives contributor read access. A deliberate, instructed policy choice, not an inherited default.
- **No rate limiting on report generation** — an authorized owner/admin could still repeatedly trigger `startup`'s (overview-backed) ten-collection aggregation. Same standing gap class as the rest of the codebase's Phase 1 rate-limiting backlog item, not a new one.
