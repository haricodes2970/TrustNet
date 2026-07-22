const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fundingRoundCreate, fundingRoundUpdate } = require("../src/validators/fundingRound.validators");
const { assertValidRoundTransition } = require("../src/services/fundingRoundService");
const ApiError = require("../src/utils/ApiError");

test("fundingRoundCreate accepts a minimal valid payload", () => {
  const { error } = fundingRoundCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    title: "Seed Round",
    roundType: "seed",
    targetAmount: 500000,
  });
  assert.equal(error, undefined);
});

test("fundingRoundCreate rejects a missing startupId", () => {
  const { error } = fundingRoundCreate.validate({
    title: "Seed Round",
    roundType: "seed",
    targetAmount: 500000,
  });
  assert.ok(error);
});

test("fundingRoundCreate rejects an invalid roundType", () => {
  const { error } = fundingRoundCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    title: "Seed Round",
    roundType: "series-z",
    targetAmount: 500000,
  });
  assert.ok(error);
});

test("fundingRoundCreate rejects a negative targetAmount", () => {
  const { error } = fundingRoundCreate.validate({
    startupId: "507f1f77bcf86cd799439011",
    title: "Seed Round",
    roundType: "seed",
    targetAmount: -1,
  });
  assert.ok(error);
});

test("fundingRoundUpdate allows a partial payload with no required fields", () => {
  const { error } = fundingRoundUpdate.validate({});
  assert.equal(error, undefined);
});

test("fundingRoundUpdate rejects an invalid currency value", () => {
  const { error } = fundingRoundUpdate.validate({ currency: "JPY" });
  assert.ok(error);
});

test("assertValidRoundTransition allows draft -> open", () => {
  assert.doesNotThrow(() => assertValidRoundTransition("draft", "open"));
});

test("assertValidRoundTransition allows open -> closed", () => {
  assert.doesNotThrow(() => assertValidRoundTransition("open", "closed"));
});

test("assertValidRoundTransition allows draft -> cancelled", () => {
  assert.doesNotThrow(() => assertValidRoundTransition("draft", "cancelled"));
});

test("assertValidRoundTransition allows open -> cancelled", () => {
  assert.doesNotThrow(() => assertValidRoundTransition("open", "cancelled"));
});

test("assertValidRoundTransition rejects skipping draft -> closed", () => {
  assert.throws(() => assertValidRoundTransition("draft", "closed"), /Invalid status transition/);
});

test("assertValidRoundTransition rejects any transition out of a terminal state", () => {
  assert.throws(() => assertValidRoundTransition("closed", "open"), /terminal state/);
  assert.throws(() => assertValidRoundTransition("cancelled", "open"), /terminal state/);
});

test("assertValidRoundTransition throws ApiError with statusCode 409", () => {
  try {
    assertValidRoundTransition("closed", "open");
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 409);
  }
});
