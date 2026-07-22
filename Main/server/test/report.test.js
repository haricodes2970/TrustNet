const { test } = require("node:test");
const assert = require("node:assert/strict");
const { escapeCsvField, flattenToRows, toCsv } = require("../src/services/reportService");

test("escapeCsvField returns plain values unquoted", () => {
  assert.equal(escapeCsvField("hello"), "hello");
  assert.equal(escapeCsvField(42), "42");
});

test("escapeCsvField quotes and escapes a value containing a comma", () => {
  assert.equal(escapeCsvField("Acme, Inc."), '"Acme, Inc."');
});

test("escapeCsvField quotes and doubles embedded quotes", () => {
  assert.equal(escapeCsvField('Say "hi"'), '"Say ""hi"""');
});

test("escapeCsvField quotes a value containing a newline", () => {
  assert.equal(escapeCsvField("line1\nline2"), '"line1\nline2"');
});

test("escapeCsvField renders null/undefined as an empty string", () => {
  assert.equal(escapeCsvField(null), "");
  assert.equal(escapeCsvField(undefined), "");
});

test("flattenToRows flattens nested objects into dotted-key rows", () => {
  const rows = flattenToRows({ a: 1, b: { c: 2, d: 3 } });
  assert.deepEqual(rows, [
    ["a", 1],
    ["b.c", 2],
    ["b.d", 3],
  ]);
});

test("flattenToRows converts a Date into an ISO string", () => {
  const date = new Date("2026-01-01T00:00:00.000Z");
  const rows = flattenToRows({ generatedAt: date });
  assert.deepEqual(rows, [["generatedAt", "2026-01-01T00:00:00.000Z"]]);
});

test("toCsv renders a header row plus one row per flattened field", () => {
  const csv = toCsv({ reportType: "tasks", data: { totalTasks: 3 } });
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "metric,value");
  assert.ok(lines.includes("reportType,tasks"));
  assert.ok(lines.includes("data.totalTasks,3"));
});

test("toCsv correctly escapes a field containing a comma", () => {
  const csv = toCsv({ startup: { name: "Acme, Inc." } });
  assert.ok(csv.includes('startup.name,"Acme, Inc."'));
});
