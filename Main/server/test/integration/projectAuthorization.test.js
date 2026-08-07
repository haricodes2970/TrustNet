// Phase 2, Section 2 (Project Authorization) + Section 5 (regression:
// Project list workspace-filter authorization). Verifies projectService
// against a real MongoDB instance. Out of scope: validators, controllers,
// routes, performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createCollaborationFixture } = require("./helpers/collaborationFixtures");
const projectService = require("../../src/services/projectService");
const Workspace = require("../../src/models/Workspace");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

test("a user with workspace access (founder) sees the project via listProjectsForUser with no filter", async () => {
  const fx = await createCollaborationFixture();
  const projects = await projectService.listProjectsForUser(fx.founder.user._id, {}, {});
  const ids = projects.map((p) => String(p._id));
  assert.ok(ids.includes(String(fx.project._id)));
});

test("a Team member with workspace access (contributor) sees the project via listProjectsForUser with no filter", async () => {
  const fx = await createCollaborationFixture();
  const projects = await projectService.listProjectsForUser(fx.contributorMember.user._id, {}, {});
  const ids = projects.map((p) => String(p._id));
  assert.ok(ids.includes(String(fx.project._id)));
});

test("an unrelated user sees no projects via listProjectsForUser with no filter", async () => {
  const fx = await createCollaborationFixture();
  const projects = await projectService.listProjectsForUser(fx.unrelatedUser.user._id, {}, {});
  assert.equal(projects.length, 0);
});

// Regression: this filter previously would have trusted an arbitrary
// caller-supplied workspaceId without re-checking access. Fixed during
// Projects-phase development; this test locks the fix in permanently.
test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?workspaceId= filter", async () => {
  const fx = await createCollaborationFixture();
  await assert.rejects(
    () =>
      projectService.listProjectsForUser(fx.unrelatedUser.user._id, { workspace: fx.workspace._id }, {}),
    /not authorized/
  );
});

test("a user with workspace access CAN use an explicit ?workspaceId= filter to see the project", async () => {
  const fx = await createCollaborationFixture();
  const projects = await projectService.listProjectsForUser(
    fx.founder.user._id,
    { workspace: fx.workspace._id },
    {}
  );
  const ids = projects.map((p) => String(p._id));
  assert.ok(ids.includes(String(fx.project._id)));
});

test("creating a project fails when the parent workspace is archived", async () => {
  const fx = await createCollaborationFixture();
  await Workspace.findByIdAndUpdate(fx.workspace._id, { isArchived: true });

  await assert.rejects(
    () => projectService.createProject({ workspaceId: fx.workspace._id, name: "New Project" }, fx.founder.user._id),
    /archived/
  );
});

test("updating a project fails when the parent workspace is archived", async () => {
  const fx = await createCollaborationFixture();
  await Workspace.findByIdAndUpdate(fx.workspace._id, { isArchived: true });

  await assert.rejects(
    () => projectService.updateProject(fx.project._id, fx.founder.user._id, { name: "Renamed" }),
    /archived/
  );
});

// Fixed in the Projects phase (was previously documented here as "CURRENT
// BEHAVIOR", a known gap, not desired behavior): archiving a project now
// hides it from the default listProjectsForUser view, and further updates
// to an archived project are rejected until it's restored. See
// restoreProject and the duplicate-name/status-code fixes in the same pass.
test("archiving a project hides it from the default listProjectsForUser view", async () => {
  const fx = await createCollaborationFixture();
  await projectService.archiveProject(fx.project._id, fx.founder.user._id);

  const projects = await projectService.listProjectsForUser(fx.founder.user._id, {}, {});
  const ids = projects.map((p) => String(p._id));
  assert.ok(!ids.includes(String(fx.project._id)));

  // Still reachable via an explicit filter, same override-friendly pattern
  // used by every other module's default-excluded listing filter.
  const withArchived = await projectService.listProjectsForUser(fx.founder.user._id, { isArchived: true }, {});
  assert.ok(withArchived.map((p) => String(p._id)).includes(String(fx.project._id)));
});

test("an archived project rejects further updates until restored", async () => {
  const fx = await createCollaborationFixture();
  await projectService.archiveProject(fx.project._id, fx.founder.user._id);

  await assert.rejects(
    () => projectService.updateProject(fx.project._id, fx.founder.user._id, { name: "Edited After Archive" }),
    /archived/
  );

  const restored = await projectService.restoreProject(fx.project._id, fx.founder.user._id);
  assert.equal(restored.isArchived, false);

  const updated = await projectService.updateProject(fx.project._id, fx.founder.user._id, {
    name: "Edited After Restore",
  });
  assert.equal(updated.name, "Edited After Restore");
});
