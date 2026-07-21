// Applications module integration tests. Verifies applicationService
// (including the real local-disk storageService provider, reused from
// Documents' phase — NOT the Document model) against a real MongoDB
// instance and a real filesystem. Out of scope: validators, controllers,
// routes, performance.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const { setupTestDB, teardownTestDB, clearDatabase } = require("./helpers/db");
const { createStartupTeamFixture } = require("./helpers/collaborationFixtures");
const { createAuthenticatedTestUser } = require("./helpers/testUser");
const applicationService = require("../../src/services/applicationService");
const jobService = require("../../src/services/jobService");

const STORAGE_ROOT = path.join(__dirname, "..", "..", "storage", "documents");

function sampleResume(overrides = {}) {
  return {
    buffer: Buffer.from("%PDF-1.4 fixture resume content"),
    mimeType: "application/pdf",
    originalFileName: "resume.pdf",
    ...overrides,
  };
}

async function createPublishedJob(fx) {
  const job = await jobService.createJob(
    {
      startupId: fx.startup._id,
      title: "Founding Engineer",
      description: "Build things.",
      employmentType: "full-time",
      remotePolicy: "remote",
    },
    fx.founder.user._id
  );
  return jobService.publishJob(job._id, fx.founder.user._id);
}

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
  // maxRetries/retryDelay: documentAuthorization.test.js shares this same
  // directory and cleans it up too — node --test runs files concurrently,
  // so a bare rm can race with the other file's rm (ENOTEMPTY on Windows).
  await fs.rm(STORAGE_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

beforeEach(async () => {
  await clearDatabase();
});

// --- Candidate: submit, view own, update resume/cover letter, withdraw ---

test("any authenticated user (candidate) can submit an application to a published job", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);

  const application = await applicationService.createApplication(
    { jobId: job._id, coverLetter: "I'd love to join.", ...sampleResume() },
    candidate.user._id
  );

  assert.equal(application.status, "submitted");
  assert.equal(String(application.applicant), String(candidate.user._id));
  assert.equal(application.resumeStorageProvider, "local");
  assert.ok(application.resumeChecksum);
  assert.equal(application.url, undefined);
});

test("candidate can view their own application", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  const viewed = await applicationService.getApplicationForViewer(application._id, candidate.user._id);
  assert.equal(String(viewed._id), String(application._id));
});

test("candidate CANNOT view another candidate's application", async () => {
  const fx = await createStartupTeamFixture();
  const candidateA = await createAuthenticatedTestUser();
  const candidateB = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidateA.user._id
  );

  await assert.rejects(
    () => applicationService.getApplicationForViewer(application._id, candidateB.user._id),
    /not authorized/
  );
});

test("candidate can update their resume while status is 'submitted'", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  const updated = await applicationService.updateResume(
    application._id,
    candidate.user._id,
    sampleResume({ originalFileName: "resume-v2.pdf" })
  );
  assert.equal(updated.resumeFileName, "resume-v2.pdf");
  assert.notEqual(updated.resumeStorageKey, application.resumeStorageKey);
});

test("candidate can update their cover letter while status is 'submitted'", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  const updated = await applicationService.updateCoverLetter(application._id, candidate.user._id, "Revised letter.");
  assert.equal(updated.coverLetter, "Revised letter.");
});

test("candidate CANNOT edit resume/cover letter once status has moved past 'submitted'", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );
  await applicationService.updateStatus(application._id, fx.founder.user._id, { status: "under_review" });

  await assert.rejects(
    () => applicationService.updateCoverLetter(application._id, candidate.user._id, "Too late"),
    /no longer be edited/
  );
  await assert.rejects(
    () => applicationService.updateResume(application._id, candidate.user._id, sampleResume()),
    /no longer be edited/
  );
});

test("candidate CANNOT edit another candidate's application (resume/cover letter/withdraw)", async () => {
  const fx = await createStartupTeamFixture();
  const candidateA = await createAuthenticatedTestUser();
  const candidateB = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidateA.user._id
  );

  await assert.rejects(() => applicationService.updateCoverLetter(application._id, candidateB.user._id, "Hijacked"), /not authorized/);
  await assert.rejects(() => applicationService.updateResume(application._id, candidateB.user._id, sampleResume()), /not authorized/);
  await assert.rejects(() => applicationService.withdraw(application._id, candidateB.user._id), /not authorized/);
});

test("candidate can withdraw from a non-terminal state", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  const withdrawn = await applicationService.withdraw(application._id, candidate.user._id);
  assert.equal(withdrawn.status, "withdrawn");
});

test("candidate CANNOT withdraw an already-terminal application", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );
  await applicationService.updateStatus(application._id, fx.founder.user._id, { status: "under_review" });
  await applicationService.updateStatus(application._id, fx.founder.user._id, { status: "rejected" });

  await assert.rejects(() => applicationService.withdraw(application._id, candidate.user._id), /terminal state/);
});

// --- Startup owner/admin ---

test("owner can view an application for their job, including notes", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );
  await applicationService.updateStatus(application._id, fx.founder.user._id, { notes: "Looks promising." });

  const viewed = await applicationService.getApplicationForViewer(application._id, fx.founder.user._id);
  assert.equal(viewed.notes, "Looks promising.");
});

test("admin can update application status along the happy path", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  const updated = await applicationService.updateStatus(application._id, fx.adminMember.user._id, {
    status: "under_review",
  });
  assert.equal(updated.status, "under_review");
});

test("owner/admin CANNOT skip status stages", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  await assert.rejects(
    () => applicationService.updateStatus(application._id, fx.founder.user._id, { status: "offer" }),
    /Invalid status transition/
  );
});

test("owner/admin can reject from any non-terminal state", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  const rejected = await applicationService.updateStatus(application._id, fx.founder.user._id, {
    status: "rejected",
  });
  assert.equal(rejected.status, "rejected");
});

test("owner/admin CANNOT move a terminal application to another status", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );
  await applicationService.updateStatus(application._id, fx.founder.user._id, { status: "rejected" });

  await assert.rejects(
    () => applicationService.updateStatus(application._id, fx.founder.user._id, { status: "under_review" }),
    /terminal state/
  );
});

test("owner/admin CANNOT edit resume or cover letter", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  // applicationService exposes no owner/admin path to updateResume/updateCoverLetter at all —
  // calling them as the founder is rejected exactly like any other non-applicant.
  await assert.rejects(
    () => applicationService.updateCoverLetter(application._id, fx.founder.user._id, "Staff edit"),
    /not authorized/
  );
});

// --- Contributor and unrelated users: no access ---

test("contributor CANNOT view an application (no access, unlike Job's read-only contributor tier)", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  await assert.rejects(
    () => applicationService.getApplicationForViewer(application._id, fx.contributorMember.user._id),
    /not authorized/
  );
});

test("contributor CANNOT update application status", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  await assert.rejects(
    () => applicationService.updateStatus(application._id, fx.contributorMember.user._id, { status: "under_review" }),
    /not authorized/
  );
});

test("unrelated user CANNOT view or act on an application", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  await assert.rejects(
    () => applicationService.getApplicationForViewer(application._id, fx.unrelatedUser.user._id),
    /not authorized/
  );
  await assert.rejects(
    () => applicationService.updateStatus(application._id, fx.unrelatedUser.user._id, { status: "under_review" }),
    /not authorized/
  );
});

// --- Business rules: job state gates ---

test("cannot apply to a draft (unpublished) job", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await jobService.createJob(
    { startupId: fx.startup._id, title: "Draft Job", description: "x", employmentType: "full-time", remotePolicy: "remote" },
    fx.founder.user._id
  );

  await assert.rejects(
    () => applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id),
    /not accepting applications/
  );
});

test("cannot apply to an archived job", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  await jobService.archiveJob(job._id, fx.founder.user._id);

  await assert.rejects(
    () => applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id),
    /not accepting applications/
  );
});

test("cannot apply to a job that was published then reverted to draft (closed for applications)", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  await jobService.unpublishJob(job._id, fx.founder.user._id);

  await assert.rejects(
    () => applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id),
    /not accepting applications/
  );
});

// --- Duplicate prevention (app-level check + DB partial unique index) ---

test("a candidate cannot submit a second active application to the same job", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id);

  await assert.rejects(
    () => applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id),
    /already applied/
  );
});

test("a candidate CAN re-apply after withdrawing (partial unique index excludes 'withdrawn')", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const first = await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id);
  await applicationService.withdraw(first._id, candidate.user._id);

  const second = await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id);
  assert.equal(second.status, "submitted");
});

// --- Storage behavior ---

test("resume is actually written to disk under the local storage provider", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );

  const fileExists = await fs
    .access(path.join(STORAGE_ROOT, application.resumeStorageKey))
    .then(() => true)
    .catch(() => false);
  assert.ok(fileExists);
});

// --- List authorization + regression ---

test("REGRESSION: an explicit ?jobId= filter never leaks another candidate's application to a non-owner/admin viewer", async () => {
  const fx = await createStartupTeamFixture();
  const candidateA = await createAuthenticatedTestUser();
  const candidateB = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidateA.user._id);
  const applicationB = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidateB.user._id
  );

  const results = await applicationService.listApplicationsForUser(candidateB.user._id, { job: job._id }, {});
  assert.equal(results.length, 1);
  assert.equal(String(results[0]._id), String(applicationB._id));
});

test("owner/admin listing with an explicit jobId filter sees every application for that job", async () => {
  const fx = await createStartupTeamFixture();
  const candidateA = await createAuthenticatedTestUser();
  const candidateB = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidateA.user._id);
  await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidateB.user._id);

  const results = await applicationService.listApplicationsForUser(fx.founder.user._id, { job: job._id }, {});
  assert.equal(results.length, 2);
});

test("a candidate's list with no filter returns only their own applications, notes redacted", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  const application = await applicationService.createApplication(
    { jobId: job._id, ...sampleResume() },
    candidate.user._id
  );
  await applicationService.updateStatus(application._id, fx.founder.user._id, { notes: "secret" });

  const results = await applicationService.listApplicationsForUser(candidate.user._id, {}, {});
  assert.equal(results.length, 1);
  assert.equal(results[0].notes, undefined);
});

test("contributor's list with no filter is empty (they have no applications of their own)", async () => {
  const fx = await createStartupTeamFixture();
  const candidate = await createAuthenticatedTestUser();
  const job = await createPublishedJob(fx);
  await applicationService.createApplication({ jobId: job._id, ...sampleResume() }, candidate.user._id);

  const results = await applicationService.listApplicationsForUser(fx.contributorMember.user._id, {}, {});
  assert.equal(results.length, 0);
});
