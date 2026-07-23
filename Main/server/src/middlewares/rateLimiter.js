// Adapted from Developer 1's trustnet 2/Main/server/src/middlewares/rateLimiter.js
// during the backend merge. Dropped Developer 1's auditLogService coupling —
// that model/service was not adopted (see BACKLOG.md merge notes); this
// version logs to console only, consistent with errorHandler.js's existing
// console.error usage elsewhere in this codebase. Closes the standing
// "no rate limiting" gap tracked in SECURITY.md/BACKLOG.md since Phase 1.
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const rateLimitsConfig = require("../config/rateLimits");

function handler(req, res) {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const user = req.user ? req.user.id : "unauthenticated";
  console.warn(
    `[RateLimit] Exceeded - Endpoint: ${req.originalUrl} | IP: ${ip} | User: ${user} | Timestamp: ${new Date().toISOString()}`
  );
  return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
}

function createLimiter(config, keyGenerator) {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    ...(keyGenerator && { keyGenerator }),
  });
}

// express-rate-limit requires IPv6 addresses to go through its own
// ipKeyGenerator helper (normalizes to a /56 subnet) rather than being used
// raw as a key — using req.ip directly would let IPv6 users bypass the
// per-IP limit by rotating within their subnet.
const byUserOrIp = (req) => (req.user && req.user.id ? req.user.id : ipKeyGenerator(req.ip));

module.exports = {
  signupLimiter: createLimiter(rateLimitsConfig.signup),
  loginLimiter: createLimiter(rateLimitsConfig.login),
  forgotPasswordLimiter: createLimiter(rateLimitsConfig.forgotPassword),
  resendVerificationLimiter: createLimiter(rateLimitsConfig.resendVerification),
  searchLimiter: createLimiter(rateLimitsConfig.search, byUserOrIp),
  aiApiLimiter: createLimiter(rateLimitsConfig.ai, byUserOrIp),
  defaultLimiter: createLimiter(rateLimitsConfig.default),
  handler,
  byUserOrIp,
};
