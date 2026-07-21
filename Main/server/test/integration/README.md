# Integration tests

Infrastructure only as of this phase — no collaboration-permission integration tests exist yet (deliberately out of scope, see `ROADMAP.md`/`BACKLOG.md`).

## How this differs from `test/*.test.js`

The existing 37 unit tests (`test/*.test.js`, run by `npm test`) are pure/DB-free — Joi validators, `assertOwner`, `canMutateTask`. Integration tests (`test/integration/*.test.js`) spin up a real (in-memory) MongoDB and exercise actual Mongoose models/queries. They run separately, on a separate npm script, so the fast unit suite never pays the cost of starting a database.

## Infrastructure

- **`mongodb-memory-server`** — spins up a real, throwaway `mongod` process per test file, no Docker/external DB required, no `MONGO_URI` env dependency.
- **`test/integration/helpers/db.js`** — `setupTestDB()` (start server + `mongoose.connect`), `teardownTestDB()` (disconnect + stop server), `clearDatabase()` (delete all documents from every collection — call between tests for isolation).
- **`test/integration/helpers/testUser.js`** — `createAuthenticatedTestUser(overrides?)` creates a persisted `User` document and signs a matching JWT access token (same shape `src/middlewares/auth.js` actually verifies: `payload.sub`/`payload.email`), so a future integration test can simulate `Authorization: Bearer <token>` without going through the real `/auth/register` + `/auth/login` flow.

## Standard test-file shape

```js
const { test, before, after, beforeEach } = require("node:test");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");

before(async () => { await setupTestDB(); });
after(async () => { await teardownTestDB(); });
beforeEach(async () => { await clearDatabase(); });

test("...", async () => { /* ... */ });
```

## Running

| Command | Runs |
|---|---|
| `npm test` | unit tests only (`test/*.test.js`) — unchanged from before this phase |
| `npm run test:integration` | integration tests only (`test/integration/*.test.js`) |
| `npm run test:all` | both |

## First-run note

`mongodb-memory-server` downloads a `mongod` binary the first time it runs (cached afterward, typically under the OS temp/cache dir, outside the repo). This means the **first** `npm run test:integration` run on a machine (or in a fresh CI runner with no cache) needs network access and can take noticeably longer than subsequent runs. If CI ever runs this without network access or a pre-warmed cache, it will fail on the download step, not on test logic — worth knowing before debugging a "flaky" CI failure here.

## What's deliberately not here yet

No test in this directory touches `resolveWorkspaceAccess`, `canMutateTask`, or any other collaboration-module permission logic — this phase was infrastructure only. See `docs/modules/*.md` "Architectural concerns discovered" sections and the Collaboration Architecture Audit for the recommended order to add those next.
