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
    // 5/hour, not the tighter 3/hour originally sketched for this stub -
    // still a meaningful anti-abuse throttle for an email-sending endpoint
    // (same order of magnitude as forgotPassword's 3/hour), chosen to also
    // leave headroom for legitimate multi-step verification test coverage
    // within one rate-limit window.
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
  },
  emailVerify: {
    // OTP brute-force protection - same shape/threat class as
    // twoFactorVerify (guessing a 6-digit code), not reused directly so
    // the two stay independently tunable and log under distinct names.
    // 20/15min at the IP layer is secondary defense-in-depth; the primary
    // brute-force defense is the 5-wrong-guesses-per-account lockout
    // (MAX_OTP_ATTEMPTS in auth.routes.js), which this limit doesn't
    // replace.
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20,
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
