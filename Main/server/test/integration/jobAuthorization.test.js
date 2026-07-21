// Hiring module integration tests. Verifies jobService (including its own
// deliberately-duplicated resolveStartupAccess/getAccessibleStartupIds
// helpers — NOT workspaceService) against a real MongoDB instance. Out of
// scope: validators, controllers, routes, performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const {
  createCollaborationFixture,
  createStartupTeamFixture,
} = require("./helpers/collaborationFixtures");
const jobService = require("../../src/services/jobService");

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearDatabase();
});

function completeJobPayload(startupId, overrides = {}) {
  return {
    startupId,
    title: "Founding Engineer",
    description: "Build the core product.",
    employmentType: "full-time",
    remotePolicy: "remote",
    ...overrides,
  };
}

// --- Owner/Admin: create, edit, archive, publish, unpublish ---

test("owner can create a job (defaults to draft)", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  assert.equal(job.status, "draft");
  assert.equal(String(job.createdBy), String(fx.founder.user._id));
});

test("admin can create a job", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(
    completeJobPayload(fx.startup._id),
    fx.adminMember.user._id
  );
  assert.equal(String(job.createdBy), String(fx.adminMember.user._id));
});

test("contributor CANNOT create a job", async () => {
  const fx = await createStartupTeamFixture();
  await assert.rejects(
    () => jobService.createJob(completeJobPayload(fx.startup._id), fx.contributorMember.user._id),
    /not authorized/
  );
});

test("unrelated user CANNOT create a job", async () => {
  const fx = await createStartupTeamFixture();
  await assert.rejects(
    () => jobService.createJob(completeJobPayload(fx.startup._id), fx.unrelatedUser.user._id),
    /not authorized/
  );
});

test("owner can update job metadata", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  const updated = await jobService.updateJob(job._id, fx.founder.user._id, { department: "Engineering" });
  assert.equal(updated.department, "Engineering");
});

test("contributor CANNOT update job metadata", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  await assert.rejects(
    () => jobService.updateJob(job._id, fx.contributorMember.user._id, { department: "Sales" }),
    /not authorized/
  );
});

test("owner can archive a job", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  const archived = await jobService.archiveJob(job._id, fx.founder.user._id);
  assert.equal(archived.isArchived, true);
});

test("contributor CANNOT archive a job", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  await assert.rejects(
    () => jobService.archiveJob(job._id, fx.contributorMember.user._id),
    /not authorized/
  );
});

test("owner can publish a complete draft", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  const published = await jobService.publishJob(job._id, fx.founder.user._id);
  assert.equal(published.status, "published");
});

test("owner can unpublish a job back to draft", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  await jobService.publishJob(job._id, fx.founder.user._id);
  const unpublished = await jobService.unpublishJob(job._id, fx.founder.user._id);
  assert.equal(unpublished.status, "draft");
});

test("contributor CANNOT publish or unpublish", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  await assert.rejects(() => jobService.publishJob(job._id, fx.contributorMember.user._id), /not authorized/);
  await assert.rejects(() => jobService.unpublishJob(job._id, fx.contributorMember.user._id), /not authorized/);
});

// --- Publish validation (business rules) ---

test("publishing an incomplete draft is rejected", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob({ startupId: fx.startup._id, title: "Bare Draft" }, fx.founder.user._id);
  await assert.rejects(
    () => jobService.publishJob(job._id, fx.founder.user._id),
    /missing required field/
  );
});

test("publishing an archived job is rejected, even if otherwise complete", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  await jobService.archiveJob(job._id, fx.founder.user._id);
  await assert.rejects(
    () => jobService.publishJob(job._id, fx.founder.user._id),
    /Archived jobs cannot be published/
  );
});

test("creating a job with salaryMin > salaryMax is rejected", async () => {
  const fx = await createStartupTeamFixture();
  await assert.rejects(
    () =>
      jobService.createJob(
        completeJobPayload(fx.startup._id, { salaryMin: 150000, salaryMax: 90000 }),
        fx.founder.user._id
      ),
    /salaryMin must be less than or equal to salaryMax/
  );
});

test("updating a job's salaryMin above its existing salaryMax is rejected", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(
    completeJobPayload(fx.startup._id, { salaryMin: 50000, salaryMax: 90000 }),
    fx.founder.user._id
  );
  await assert.rejects(
    () => jobService.updateJob(job._id, fx.founder.user._id, { salaryMin: 100000 }),
    /salaryMin must be less than or equal to salaryMax/
  );
});

// --- Visibility: public, contributor read-only, draft invisibility ---

test("public (no user) can view a published job", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  await jobService.publishJob(job._id, fx.founder.user._id);

  const fresh = await jobService.getJobById(job._id);
  await assert.doesNotReject(() => jobService.assertJobViewAccess(fresh, null));
});

test("public (no user) CANNOT view a draft job — 'not found', not 'not authorized'", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);

  await assert.rejects(() => jobService.assertJobViewAccess(job, null), /Job not found/);
});

test("an authenticated but unrelated user viewing a draft also gets 'not found', not 'not authorized'", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);

  await assert.rejects(
    () => jobService.assertJobViewAccess(job, fx.unrelatedUser.user._id),
    /Job not found/
  );
});

test("contributor CAN view a draft job (read-only tier)", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);

  await assert.doesNotReject(() => jobService.assertJobViewAccess(job, fx.contributorMember.user._id));
});

test("contributor CAN view a published job", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  const published = await jobService.publishJob(job._id, fx.founder.user._id);

  await assert.doesNotReject(() => jobService.assertJobViewAccess(published, fx.contributorMember.user._id));
});

test("public CANNOT view an archived-but-still-'published'-status job", async () => {
  const fx = await createStartupTeamFixture();
  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  await jobService.publishJob(job._id, fx.founder.user._id);
  const archived = await jobService.archiveJob(job._id, fx.founder.user._id);

  assert.equal(archived.status, "published"); // status untouched by archive, by design
  await assert.rejects(() => jobService.assertJobViewAccess(archived, null), /Job not found/);
});

// --- Workspace/Project independence ---

test("INDEPENDENCE: full job lifecycle works with a Startup+Team fixture that has NO Workspace and NO Project", async () => {
  const fx = await createStartupTeamFixture();
  assert.equal(fx.workspace, undefined);
  assert.equal(fx.project, undefined);

  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  const published = await jobService.publishJob(job._id, fx.founder.user._id);
  assert.equal(published.status, "published");

  await assert.doesNotReject(() => jobService.assertJobViewAccess(published, fx.contributorMember.user._id));
});

test("INDEPENDENCE (other direction): job authorization also works fine when a Workspace and Project DO exist for the startup", async () => {
  const fx = await createCollaborationFixture();
  assert.ok(fx.workspace);
  assert.ok(fx.project);

  const job = await jobService.createJob(completeJobPayload(fx.startup._id), fx.founder.user._id);
  assert.ok(job._id);
  await assert.rejects(
    () => jobService.createJob(completeJobPayload(fx.startup._id), fx.contributorMember.user._id),
    /not authorized/
  );
});

// --- List authorization + regression: query filters cannot bypass ---

test("REGRESSION: an unrelated user cannot bypass authorization via an explicit ?startupId= filter — silently downgrades to published-only, not a bypass", async () => {
  const fx = await createStartupTeamFixture();
  await jobService.createJob(completeJobPayload(fx.startup._id, { title: "Draft, hidden" }), fx.founder.user._id);
  const publishedJob = await jobService.createJob(
    completeJobPayload(fx.startup._id, { title: "Published, visible" }),
    fx.founder.user._id
  );
  await jobService.publishJob(publishedJob._id, fx.founder.user._id);

  const results = await jobService.listJobsForUser(fx.unrelatedUser.user._id, { startup: fx.startup._id }, {});
  const titles = results.map((j) => j.title);
  assert.deepEqual(titles, ["Published, visible"]);
});

test("owner/admin with an explicit ?startupId= filter sees ALL statuses for their own startup", async () => {
  const fx = await createStartupTeamFixture();
  await jobService.createJob(completeJobPayload(fx.startup._id, { title: "Draft" }), fx.founder.user._id);
  const publishedJob = await jobService.createJob(
    completeJobPayload(fx.startup._id, { title: "Published" }),
    fx.founder.user._id
  );
  await jobService.publishJob(publishedJob._id, fx.founder.user._id);

  const results = await jobService.listJobsForUser(fx.adminMember.user._id, { startup: fx.startup._id }, {});
  assert.equal(results.length, 2);
});

test("anonymous listing with no filter returns only published jobs, across all startups", async () => {
  const fxA = await createStartupTeamFixture();
  const fxB = await createStartupTeamFixture();

  const draftA = await jobService.createJob(completeJobPayload(fxA.startup._id, { title: "A draft" }), fxA.founder.user._id);
  const publishedA = await jobService.createJob(
    completeJobPayload(fxA.startup._id, { title: "A published" }),
    fxA.founder.user._id
  );
  await jobService.publishJob(publishedA._id, fxA.founder.user._id);

  const publishedB = await jobService.createJob(
    completeJobPayload(fxB.startup._id, { title: "B published" }),
    fxB.founder.user._id
  );
  await jobService.publishJob(publishedB._id, fxB.founder.user._id);

  const results = await jobService.listJobsForUser(null, {}, {});
  const titles = results.map((j) => j.title).sort();
  assert.deepEqual(titles, ["A published", "B published"]);
  assert.ok(!titles.includes("A draft"));
});

test("authenticated founder with no filter sees published jobs everywhere PLUS all statuses for their own startup", async () => {
  const fxA = await createStartupTeamFixture();
  const fxB = await createStartupTeamFixture();

  const draftA = await jobService.createJob(completeJobPayload(fxA.startup._id, { title: "My draft" }), fxA.founder.user._id);
  const publishedB = await jobService.createJob(
    completeJobPayload(fxB.startup._id, { title: "Someone else's published" }),
    fxB.founder.user._id
  );
  await jobService.publishJob(publishedB._id, fxB.founder.user._id);
  const draftB = await jobService.createJob(
    completeJobPayload(fxB.startup._id, { title: "Someone else's draft" }),
    fxB.founder.user._id
  );

  const results = await jobService.listJobsForUser(fxA.founder.user._id, {}, {});
  const titles = results.map((j) => j.title).sort();
  assert.deepEqual(titles, ["My draft", "Someone else's published"]);
});
