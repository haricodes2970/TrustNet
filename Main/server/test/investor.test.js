const { test } = require("node:test");
const assert = require("node:assert/strict");
const { investorProfileCreate } = require("../src/validators/investor.validators");

test("investorProfileCreate accepts an empty payload (all fields optional)", () => {
  const { error } = investorProfileCreate.validate({});
  assert.equal(error, undefined);
});

test("investorProfileCreate accepts a full payload", () => {
  const { error } = investorProfileCreate.validate({
    organization: "Acme Capital",
    investmentThesis: "Early-stage SaaS.",
    preferredStages: ["early-stage", "growth"],
    preferredIndustries: ["fintech"],
    preferredRegions: ["North America"],
  });
  assert.equal(error, undefined);
});

test("investorProfileCreate rejects an invalid stage value", () => {
  const { error } = investorProfileCreate.validate({ preferredStages: ["series-a"] });
  assert.ok(error);
});
