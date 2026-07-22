const { test } = require("node:test");
const assert = require("node:assert/strict");
const { engagementRequestCreate, statusUpdate } = require("../src/validators/engagementRequest.validators");
const { assertValidEngagementTransition } = require("../src/services/engagementRequestService");
const ApiError = require("../src/utils/ApiError");

test("engagementRequestCreate accepts a minimal payload", () => {
  const { error } = engagementRequestCreate.validate({
    serviceListingId: "507f1f77bcf86cd799439011",
    startupId: "507f1f77bcf86cd799439012",
  });
  assert.equal(error, undefined);
});

test("engagementRequestCreate rejects a missing startupId", () => {
  const { error } = engagementRequestCreate.validate({ serviceListingId: "507f1f77bcf86cd799439011" });
  assert.ok(error);
});

test("engagementRequestCreate rejects a missing serviceListingId", () => {
  const { error } = engagementRequestCreate.validate({ startupId: "507f1f77bcf86cd799439012" });
  assert.ok(error);
});

test("statusUpdate rejects 'requested' and 'cancelled' as provider-settable values", () => {
  assert.ok(statusUpdate.validate({ status: "requested" }).error);
  assert.ok(statusUpdate.validate({ status: "cancelled" }).error);
});

test("statusUpdate accepts every provider-settable status", () => {
  for (const status of ["accepted", "declined", "in_progress", "completed"]) {
    assert.equal(statusUpdate.validate({ status }).error, undefined);
  }
});

test("assertValidEngagementTransition allows the full happy path", () => {
  assert.doesNotThrow(() => assertValidEngagementTransition("requested", "accepted"));
  assert.doesNotThrow(() => assertValidEngagementTransition("accepted", "in_progress"));
  assert.doesNotThrow(() => assertValidEngagementTransition("in_progress", "completed"));
});

test("assertValidEngagementTransition allows decline from requested or accepted", () => {
  assert.doesNotThrow(() => assertValidEngagementTransition("requested", "declined"));
  assert.doesNotThrow(() => assertValidEngagementTransition("accepted", "declined"));
});

test("assertValidEngagementTransition allows cancel from requested or accepted", () => {
  assert.doesNotThrow(() => assertValidEngagementTransition("requested", "cancelled"));
  assert.doesNotThrow(() => assertValidEngagementTransition("accepted", "cancelled"));
});

test("assertValidEngagementTransition rejects decline/cancel from in_progress", () => {
  assert.throws(() => assertValidEngagementTransition("in_progress", "declined"), /Invalid status transition/);
  assert.throws(() => assertValidEngagementTransition("in_progress", "cancelled"), /Invalid status transition/);
});

test("assertValidEngagementTransition rejects skipping ahead", () => {
  assert.throws(() => assertValidEngagementTransition("requested", "in_progress"), /Invalid status transition/);
  assert.throws(() => assertValidEngagementTransition("requested", "completed"), /Invalid status transition/);
});

test("assertValidEngagementTransition rejects any transition out of a terminal state", () => {
  assert.throws(() => assertValidEngagementTransition("declined", "accepted"), /terminal state/);
  assert.throws(() => assertValidEngagementTransition("completed", "accepted"), /terminal state/);
  assert.throws(() => assertValidEngagementTransition("cancelled", "accepted"), /terminal state/);
});

test("assertValidEngagementTransition throws ApiError with statusCode 409", () => {
  try {
    assertValidEngagementTransition("completed", "accepted");
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 409);
  }
});
