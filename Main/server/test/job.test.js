const { test } = require("node:test");
const assert = require("node:assert/strict");
const { jobCreate, jobUpdate } = require("../src/validators/job.validators");
const { validateSalaryRange, assertPublishReady } = require("../src/services/jobService");

test("jobCreate accepts a minimal payload (incomplete draft allowed)", () => {
  const { error } = jobCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    title: "Founding Engineer",
  });
  assert.equal(error, undefined);
});

test("jobCreate rejects a missing startupId", () => {
  const { error } = jobCreate.validate({ title: "Founding Engineer" });
  assert.ok(error);
  assert.match(error.message, /startupId/);
});

test("jobCreate rejects an invalid employmentType", () => {
  const { error } = jobCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    title: "Founding Engineer",
    employmentType: "freelance",
  });
  assert.ok(error);
});

test("jobUpdate does not declare a status field (status changes only via publish/unpublish)", () => {
  const keys = Object.keys(jobUpdate.describe().keys);
  assert.equal(keys.includes("status"), false);
});

test("jobUpdate allows a partial payload", () => {
  const { error } = jobUpdate.validate({ department: "Engineering" });
  assert.equal(error, undefined);
});

test("validateSalaryRange passes when salaryMin <= salaryMax", () => {
  assert.doesNotThrow(() => validateSalaryRange(50000, 90000));
});

test("validateSalaryRange throws when salaryMin > salaryMax", () => {
  assert.throws(() => validateSalaryRange(90000, 50000), /salaryMin must be less than or equal to salaryMax/);
});

test("validateSalaryRange allows either bound to be absent", () => {
  assert.doesNotThrow(() => validateSalaryRange(50000, undefined));
  assert.doesNotThrow(() => validateSalaryRange(undefined, 90000));
  assert.doesNotThrow(() => validateSalaryRange(undefined, undefined));
});

test("assertPublishReady passes for a complete, non-archived job", () => {
  const job = {
    title: "Founding Engineer",
    description: "Build things.",
    employmentType: "full-time",
    remotePolicy: "remote",
    isArchived: false,
  };
  assert.doesNotThrow(() => assertPublishReady(job));
});

test("assertPublishReady rejects an archived job", () => {
  const job = {
    title: "X",
    description: "Y",
    employmentType: "full-time",
    remotePolicy: "remote",
    isArchived: true,
  };
  assert.throws(() => assertPublishReady(job), /Archived jobs cannot be published/);
});

test("assertPublishReady rejects a job missing required content fields", () => {
  const job = { title: "Founding Engineer", isArchived: false };
  assert.throws(() => assertPublishReady(job), /missing required field/);
});
