const { test } = require("node:test");
const assert = require("node:assert/strict");
const sanitizeRequest = require("../src/middlewares/sanitizer");
const { sanitizeValue, sanitizeObject } = sanitizeRequest;

test("sanitizeValue strips a raw HTML tag from a string", () => {
  assert.equal(sanitizeValue("<script>alert(1)</script>hi"), "alert(1)hi");
});

test("sanitizeValue leaves non-string values untouched", () => {
  assert.equal(sanitizeValue(42), 42);
  assert.equal(sanitizeValue(null), null);
  assert.equal(sanitizeValue(true), true);
});

test("sanitizeObject strips a leading '$' from object keys (NoSQL operator injection)", () => {
  const result = sanitizeObject({ $where: "malicious", name: "ok" });
  assert.deepEqual(result, { where: "malicious", name: "ok" });
});

test("sanitizeObject replaces '.' in keys to block dot-notation injection", () => {
  const result = sanitizeObject({ "a.b.c": "value" });
  assert.deepEqual(result, { a_b_c: "value" });
});

test("sanitizeObject recurses into nested objects and arrays", () => {
  const result = sanitizeObject({ list: [{ "$ne": 1 }, "<b>x</b>"] });
  assert.deepEqual(result, { list: [{ ne: 1 }, "x"] });
});

test("sanitizeObject never strips tags from a password field", () => {
  const result = sanitizeObject({ password: "<not-a-tag>P@ss123" });
  assert.equal(result.password, "<not-a-tag>P@ss123");
});

test("sanitizeRequest mutates req.body/req.params by reassignment and req.query in place", () => {
  const req = {
    body: { $set: { role: "admin" } },
    params: { id: "123" },
    query: {},
  };
  // Simulate Express 5's getter-only req.query by defining it without a setter.
  const backingQuery = { "a.b": "<script>x</script>" };
  Object.defineProperty(req, "query", {
    get() {
      return backingQuery;
    },
    configurable: true,
    enumerable: true,
  });

  let nextCalled = false;
  sanitizeRequest(req, {}, () => {
    nextCalled = true;
  });

  assert.ok(nextCalled);
  assert.deepEqual(req.body, { set: { role: "admin" } });
  assert.deepEqual(backingQuery, { a_b: "x" });
});

test("sanitizeRequest calls next(error) if sanitization throws", () => {
  const req = {
    get body() {
      throw new Error("boom");
    },
  };
  let receivedError;
  sanitizeRequest(req, {}, (err) => {
    receivedError = err;
  });
  assert.ok(receivedError instanceof Error);
});
