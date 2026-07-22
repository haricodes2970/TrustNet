const { test } = require("node:test");
const assert = require("node:assert/strict");
const { serviceListingCreate, serviceListingUpdate } = require("../src/validators/serviceListing.validators");
const { validatePriceRange, assertPublishReady } = require("../src/services/serviceListingService");
const ApiError = require("../src/utils/ApiError");

test("serviceListingCreate accepts a minimal valid payload (incomplete draft allowed)", () => {
  const { error } = serviceListingCreate.validate({ title: "Brand Strategy", category: "Marketing" });
  assert.equal(error, undefined);
});

test("serviceListingCreate rejects a missing title", () => {
  const { error } = serviceListingCreate.validate({ category: "Marketing" });
  assert.ok(error);
});

test("serviceListingCreate rejects an invalid pricingModel", () => {
  const { error } = serviceListingCreate.validate({ title: "Brand Strategy", category: "Marketing", pricingModel: "subscription" });
  assert.ok(error);
});

test("serviceListingUpdate does not declare a status field (status changes only via publish/unpublish)", () => {
  const keys = Object.keys(serviceListingUpdate.describe().keys);
  assert.equal(keys.includes("status"), false);
});

test("serviceListingUpdate allows a partial payload", () => {
  const { error } = serviceListingUpdate.validate({ title: "Renamed Listing" });
  assert.equal(error, undefined);
});

test("validatePriceRange passes when priceMin <= priceMax", () => {
  assert.doesNotThrow(() => validatePriceRange(100, 500));
});

test("validatePriceRange throws ApiError 400 when priceMin > priceMax", () => {
  try {
    validatePriceRange(500, 100);
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 400);
  }
});

test("validatePriceRange allows either bound to be absent", () => {
  assert.doesNotThrow(() => validatePriceRange(null, 500));
  assert.doesNotThrow(() => validatePriceRange(100, null));
});

test("assertPublishReady passes for a complete, non-archived listing", () => {
  assert.doesNotThrow(() =>
    assertPublishReady({
      title: "Brand Strategy",
      description: "Full brand overhaul.",
      category: "Marketing",
      pricingModel: "fixed",
      isArchived: false,
    })
  );
});

test("assertPublishReady rejects an archived listing", () => {
  assert.throws(
    () => assertPublishReady({ title: "x", description: "x", category: "x", pricingModel: "fixed", isArchived: true }),
    /Archived listings cannot be published/
  );
});

test("assertPublishReady rejects a listing missing required content fields", () => {
  assert.throws(
    () => assertPublishReady({ title: "Brand Strategy", isArchived: false }),
    /missing required field/
  );
});
