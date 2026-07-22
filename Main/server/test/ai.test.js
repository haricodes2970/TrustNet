const { test } = require("node:test");
const assert = require("node:assert/strict");
const { insightRequest } = require("../src/validators/ai.validators");
const { CAPABILITIES, buildPrompt } = require("../src/services/aiService");
const aiProviderService = require("../src/services/aiProviderService");

test("insightRequest accepts a minimal payload for a capability with no conditional fields", () => {
  const { error } = insightRequest.validate({ capability: "startup-summary", startupId: "507f1f77bcf86cd799439011" });
  assert.equal(error, undefined);
});

test("insightRequest rejects an unknown capability", () => {
  const { error } = insightRequest.validate({ capability: "not-a-real-capability", startupId: "507f1f77bcf86cd799439011" });
  assert.ok(error);
});

test("insightRequest rejects a missing startupId", () => {
  const { error } = insightRequest.validate({ capability: "startup-summary" });
  assert.ok(error);
});

test("insightRequest requires projectId for task-prioritization", () => {
  const { error } = insightRequest.validate({ capability: "task-prioritization", startupId: "507f1f77bcf86cd799439011" });
  assert.ok(error);
  assert.match(error.message, /projectId/);
});

test("insightRequest accepts task-prioritization with projectId present", () => {
  const { error } = insightRequest.validate({
    capability: "task-prioritization",
    startupId: "507f1f77bcf86cd799439011",
    projectId: "507f1f77bcf86cd799439012",
  });
  assert.equal(error, undefined);
});

test("insightRequest requires a valid section for analytics-interpretation", () => {
  const missing = insightRequest.validate({ capability: "analytics-interpretation", startupId: "507f1f77bcf86cd799439011" });
  assert.ok(missing.error);

  const invalid = insightRequest.validate({
    capability: "analytics-interpretation",
    startupId: "507f1f77bcf86cd799439011",
    section: "not-a-real-section",
  });
  assert.ok(invalid.error);

  const valid = insightRequest.validate({
    capability: "analytics-interpretation",
    startupId: "507f1f77bcf86cd799439011",
    section: "tasks",
  });
  assert.equal(valid.error, undefined);
});

test("insightRequest requires a valid reportType for report-explanation", () => {
  const missing = insightRequest.validate({ capability: "report-explanation", startupId: "507f1f77bcf86cd799439011" });
  assert.ok(missing.error);

  const valid = insightRequest.validate({
    capability: "report-explanation",
    startupId: "507f1f77bcf86cd799439011",
    reportType: "funding",
  });
  assert.equal(valid.error, undefined);
});

test("insightRequest rejects a question longer than 500 characters", () => {
  const { error } = insightRequest.validate({
    capability: "startup-summary",
    startupId: "507f1f77bcf86cd799439011",
    question: "x".repeat(501),
  });
  assert.ok(error);
});

test("all eight approved capabilities are present in the dispatch table", () => {
  const expected = [
    "startup-summary",
    "project-progress",
    "task-prioritization",
    "hiring-insights",
    "funding-summary",
    "marketplace-recommendations",
    "analytics-interpretation",
    "report-explanation",
  ];
  assert.deepEqual(Object.keys(CAPABILITIES).sort(), expected.sort());
});

test("every capability has a non-empty systemPrompt and a gatherContext function", () => {
  for (const [name, entry] of Object.entries(CAPABILITIES)) {
    assert.ok(typeof entry.systemPrompt === "string" && entry.systemPrompt.length > 0, `${name} missing systemPrompt`);
    assert.equal(typeof entry.gatherContext, "function", `${name} missing gatherContext`);
  }
});

test("buildPrompt assembles system prompt, JSON-serialized context, and question", () => {
  const prompt = buildPrompt("SYSTEM", { totalTasks: 3 }, "What should I do first?");
  assert.equal(prompt.systemPrompt, "SYSTEM");
  assert.equal(prompt.contextBlock, JSON.stringify({ totalTasks: 3 }, null, 2));
  assert.equal(prompt.question, "What should I do first?");
});

test("buildPrompt omits the question field entirely when none is given", () => {
  const prompt = buildPrompt("SYSTEM", { a: 1 }, undefined);
  assert.equal(prompt.question, undefined);
});

test("aiProviderService.generateCompletion deterministically echoes its inputs", async () => {
  const result = await aiProviderService.generateCompletion({
    systemPrompt: "SYS",
    contextBlock: '{"x":1}',
    question: "Why?",
  });
  assert.match(result, /SYS/);
  assert.match(result, /\{"x":1\}/);
  assert.match(result, /Why\?/);
});

test("aiProviderService.generateCompletion omits the question line when none is given", async () => {
  const result = await aiProviderService.generateCompletion({ systemPrompt: "SYS", contextBlock: "{}" });
  assert.doesNotMatch(result, /User question/);
});
