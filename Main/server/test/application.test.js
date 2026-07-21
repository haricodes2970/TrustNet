const { test } = require("node:test");
const assert = require("node:assert/strict");
const { applicationCreate, coverLetterUpdate, statusUpdate } = require("../src/validators/application.validators");
const { assertValidStatusTransition, redactForCandidate } = require("../src/services/applicationService");

test("applicationCreate accepts a minimal payload", () => {
  const { error } = applicationCreate.validate({ jobId: "507f1f77bcf86cd799439011" });
  assert.equal(error, undefined);
});

test("applicationCreate rejects a missing jobId", () => {
  const { error } = applicationCreate.validate({});
  assert.ok(error);
  assert.match(error.message, /jobId/);
});

test("coverLetterUpdate requires the coverLetter field (allows empty string)", () => {
  const ok = coverLetterUpdate.validate({ coverLetter: "" });
  assert.equal(ok.error, undefined);
  const missing = coverLetterUpdate.validate({});
  assert.ok(missing.error);
});

test("statusUpdate rejects 'submitted' and 'withdrawn' as staff-settable values", () => {
  assert.ok(statusUpdate.validate({ status: "submitted" }).error);
  assert.ok(statusUpdate.validate({ status: "withdrawn" }).error);
});

test("statusUpdate accepts a valid staff status", () => {
  const { error } = statusUpdate.validate({ status: "under_review" });
  assert.equal(error, undefined);
});

test("statusUpdate requires at least one of status/notes", () => {
  const { error } = statusUpdate.validate({});
  assert.ok(error);
});

test("statusUpdate accepts notes alone with no status change", () => {
  const { error } = statusUpdate.validate({ notes: "Strong candidate." });
  assert.equal(error, undefined);
});

test("assertValidStatusTransition allows the happy-path forward step", () => {
  assert.doesNotThrow(() => assertValidStatusTransition("submitted", "under_review"));
  assert.doesNotThrow(() => assertValidStatusTransition("under_review", "interview"));
  assert.doesNotThrow(() => assertValidStatusTransition("interview", "offer"));
  assert.doesNotThrow(() => assertValidStatusTransition("offer", "hired"));
});

test("assertValidStatusTransition rejects skipping ahead", () => {
  assert.throws(() => assertValidStatusTransition("submitted", "offer"), /Invalid status transition/);
});

test("assertValidStatusTransition allows rejection from any non-terminal state", () => {
  assert.doesNotThrow(() => assertValidStatusTransition("submitted", "rejected"));
  assert.doesNotThrow(() => assertValidStatusTransition("under_review", "rejected"));
  assert.doesNotThrow(() => assertValidStatusTransition("interview", "rejected"));
  assert.doesNotThrow(() => assertValidStatusTransition("offer", "rejected"));
});

test("assertValidStatusTransition rejects any transition out of a terminal state", () => {
  assert.throws(() => assertValidStatusTransition("hired", "rejected"), /terminal state/);
  assert.throws(() => assertValidStatusTransition("rejected", "under_review"), /terminal state/);
  assert.throws(() => assertValidStatusTransition("withdrawn", "under_review"), /terminal state/);
});

test("redactForCandidate strips notes but keeps everything else", () => {
  const application = { _id: "a1", status: "under_review", notes: "internal comment", coverLetter: "hi" };
  const redacted = redactForCandidate(application);
  assert.equal(redacted.notes, undefined);
  assert.equal(redacted.status, "under_review");
  assert.equal(redacted.coverLetter, "hi");
});
