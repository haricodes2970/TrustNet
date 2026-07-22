const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fundingContributionCreate } = require("../src/validators/fundingContribution.validators");
const { assertValidContributionTransition } = require("../src/services/fundingContributionService");
const ApiError = require("../src/utils/ApiError");

test("fundingContributionCreate accepts a minimal valid payload", () => {
  const { error } = fundingContributionCreate.validate({
    fundingRoundId: "507f1f77bcf86cd799439011",
    amount: 1000,
    currency: "USD",
  });
  assert.equal(error, undefined);
});

test("fundingContributionCreate rejects a missing fundingRoundId", () => {
  const { error } = fundingContributionCreate.validate({ amount: 1000, currency: "USD" });
  assert.ok(error);
});

test("fundingContributionCreate rejects a zero amount", () => {
  const { error } = fundingContributionCreate.validate({
    fundingRoundId: "507f1f77bcf86cd799439011",
    amount: 0,
    currency: "USD",
  });
  assert.ok(error);
});

test("fundingContributionCreate rejects a missing currency", () => {
  const { error } = fundingContributionCreate.validate({
    fundingRoundId: "507f1f77bcf86cd799439011",
    amount: 1000,
  });
  assert.ok(error);
});

test("assertValidContributionTransition allows pledged -> confirmed", () => {
  assert.doesNotThrow(() => assertValidContributionTransition("pledged", "confirmed"));
});

test("assertValidContributionTransition allows pledged -> rejected", () => {
  assert.doesNotThrow(() => assertValidContributionTransition("pledged", "rejected"));
});

test("assertValidContributionTransition allows pledged -> withdrawn", () => {
  assert.doesNotThrow(() => assertValidContributionTransition("pledged", "withdrawn"));
});

test("assertValidContributionTransition rejects any transition out of a terminal state", () => {
  assert.throws(() => assertValidContributionTransition("confirmed", "withdrawn"), /terminal state/);
  assert.throws(() => assertValidContributionTransition("rejected", "confirmed"), /terminal state/);
  assert.throws(() => assertValidContributionTransition("withdrawn", "confirmed"), /terminal state/);
});

test("assertValidContributionTransition throws ApiError with statusCode 409", () => {
  try {
    assertValidContributionTransition("confirmed", "withdrawn");
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 409);
  }
});
