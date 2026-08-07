// Adapted from Developer 1's trustnet 2/Main/server/src/config/rateLimits.js
// during the backend merge — window/limit values only, no other content
// carried over (Developer 1 had no test coverage for any of this; values
// are conservative defaults, not independently re-derived).
module.exports = {
  signup: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
  },
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
  },
  forgotPassword: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3,
  },
  resendVerification: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3,
  },
  twoFactorVerify: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
  },
  refresh: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 30,
  },
  sensitiveAccountAction: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    limit: 30,
  },
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10,
  },
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
  },
};
