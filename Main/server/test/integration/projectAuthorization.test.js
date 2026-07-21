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

// Current-behavior finding, not an assertion of desired behavior: archiving
// a Project does not hide it from get/list, and does not itself block
// further updates to that same project (only the parent Workspace's
// isArchived flag is checked in updateProject/createProject — the project's
// own isArchived flag is not consulted). Documented here so this is a known,
// tested fact rather than an assumption. See Phase 2 report for discussion.
test("CURRENT BEHAVIOR: an archived project is still returned by listProjectsForUser (no hide-on-archive filtering exists)", async () => {
  const fx = await createCollaborationFixture();
  await projectService.archiveProject(fx.project._id, fx.founder.user._id);

  const projects = await projectService.listProjectsForUser(fx.founder.user._id, {}, {});
  const ids = projects.map((p) => String(p._id));
  assert.ok(ids.includes(String(fx.project._id)));
});

test("CURRENT BEHAVIOR: an already-archived project can still be updated (its own isArchived flag is not checked in updateProject)", async () => {
  const fx = await createCollaborationFixture();
  await projectService.archiveProject(fx.project._id, fx.founder.user._id);

  const updated = await projectService.updateProject(fx.project._id, fx.founder.user._id, {
    name: "Edited After Archive",
  });
  assert.equal(updated.name, "Edited After Archive");
});
