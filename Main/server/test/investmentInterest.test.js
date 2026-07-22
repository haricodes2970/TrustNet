const { test } = require("node:test");
const assert = require("node:assert/strict");
const { investmentInterestCreate, statusUpdate } = require("../src/validators/investmentInterest.validators");
const { assertValidInterestTransition } = require("../src/services/investmentInterestService");

test("investmentInterestCreate accepts a minimal payload", () => {
  const { error } = investmentInterestCreate.validate({ startupId: "507f1f77bcf86cd799439011" });
  assert.equal(error, undefined);
});

test("investmentInterestCreate rejects a missing startupId", () => {
  const { error } = investmentInterestCreate.validate({});
  assert.ok(error);
});

test("statusUpdate rejects 'submitted' and 'withdrawn' as staff-settable values", () => {
  assert.ok(statusUpdate.validate({ status: "submitted" }).error);
  assert.ok(statusUpdate.validate({ status: "withdrawn" }).error);
});

test("statusUpdate accepts a valid staff status", () => {
  const { error } = statusUpdate.validate({ status: "reviewing" });
  assert.equal(error, undefined);
});

test("assertValidInterestTransition allows the happy-path forward step", () => {
  assert.doesNotThrow(() => assertValidInterestTransition("submitted", "reviewing"));
  assert.doesNotThrow(() => assertValidInterestTransition("reviewing", "contacted"));
  assert.doesNotThrow(() => assertValidInterestTransition("contacted", "accepted"));
});

test("assertValidInterestTransition rejects skipping ahead", () => {
  assert.throws(() => assertValidInterestTransition("submitted", "accepted"), /Invalid status transition/);
});

test("assertValidInterestTransition allows decline from any non-terminal state", () => {
  assert.doesNotThrow(() => assertValidInterestTransition("submitted", "declined"));
  assert.doesNotThrow(() => assertValidInterestTransition("reviewing", "declined"));
  assert.doesNotThrow(() => assertValidInterestTransition("contacted", "declined"));
});

test("assertValidInterestTransition rejects any transition out of a terminal state", () => {
  assert.throws(() => assertValidInterestTransition("accepted", "declined"), /terminal state/);
  assert.throws(() => assertValidInterestTransition("declined", "reviewing"), /terminal state/);
  assert.throws(() => assertValidInterestTransition("withdrawn", "reviewing"), /terminal state/);
});
