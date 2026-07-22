const { test } = require("node:test");
const assert = require("node:assert/strict");
const { providerProfileCreate, providerProfileUpdate } = require("../src/validators/providerProfile.validators");

test("providerProfileCreate accepts a minimal valid payload", () => {
  const { error } = providerProfileCreate.validate({ businessName: "Acme Consulting" });
  assert.equal(error, undefined);
});

test("providerProfileCreate rejects a missing businessName", () => {
  const { error } = providerProfileCreate.validate({ tagline: "We help startups." });
  assert.ok(error);
});

test("providerProfileCreate accepts a full payload", () => {
  const { error } = providerProfileCreate.validate({
    businessName: "Acme Consulting",
    tagline: "We help startups scale.",
    description: "Full-service growth consulting.",
    serviceCategories: ["marketing", "design"],
    portfolioUrl: "https://acme.example.com",
  });
  assert.equal(error, undefined);
});

test("providerProfileCreate rejects an invalid portfolioUrl", () => {
  const { error } = providerProfileCreate.validate({ businessName: "Acme Consulting", portfolioUrl: "not-a-url" });
  assert.ok(error);
});

test("providerProfileUpdate allows a partial payload with no required fields", () => {
  const { error } = providerProfileUpdate.validate({});
  assert.equal(error, undefined);
});
