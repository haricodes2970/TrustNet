const { test } = require("node:test");
const assert = require("node:assert/strict");
const rateLimitsConfig = require("../src/config/rateLimits");
const rateLimiter = require("../src/middlewares/rateLimiter");

test("rateLimitsConfig defines a windowMs and limit for every configured route class", () => {
  for (const [name, config] of Object.entries(rateLimitsConfig)) {
    assert.ok(typeof config.windowMs === "number" && config.windowMs > 0, `${name}.windowMs`);
    assert.ok(typeof config.limit === "number" && config.limit > 0, `${name}.limit`);
  }
});

test("every exported limiter is a valid Express middleware function", () => {
  for (const name of [
    "signupLimiter",
    "loginLimiter",
    "forgotPasswordLimiter",
    "resendVerificationLimiter",
    "searchLimiter",
    "aiApiLimiter",
    "defaultLimiter",
  ]) {
    assert.equal(typeof rateLimiter[name], "function", name);
  }
});

test("byUserOrIp keys by user id when authenticated", () => {
  assert.equal(rateLimiter.byUserOrIp({ user: { id: "u1" }, ip: "1.2.3.4" }), "u1");
});

test("byUserOrIp falls back to ip when unauthenticated", () => {
  assert.equal(rateLimiter.byUserOrIp({ ip: "1.2.3.4" }), "1.2.3.4");
});

test("handler responds with 429 and a plain-language message", () => {
  const req = { originalUrl: "/api/v1/auth/login", ip: "1.2.3.4", headers: {}, socket: {} };
  let statusCode;
  let body;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
    },
  };
  rateLimiter.handler(req, res);
  assert.equal(statusCode, 429);
  assert.equal(body.success, false);
  assert.match(body.message, /Too many requests/);
});
