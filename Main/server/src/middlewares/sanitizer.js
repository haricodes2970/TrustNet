// Adapted from Developer 1's trustnet 2/Main/server/src/middlewares/sanitizer.js
// during the backend merge — self-contained, no coupling to any model/
// service, so unlike most of Developer 1 this needed no rework beyond one
// fix: Express 5 exposes `req.query` as a getter with no setter
// (`Object.getOwnPropertyDescriptor(express.request, 'query').set === undefined`),
// so Developer 1's `req.query = sanitizeObject(req.query)` would silently
// no-op under Express 5 (assignment to a getter-only accessor in sloppy
// mode fails silently, it does not throw). Fixed here by mutating req.query
// in place instead of reassigning it. req.body/req.params are ordinary
// assignable properties, unaffected.
//
// Prevents NoSQL operator injection (strips a leading '$' from object keys,
// replaces '.' to block dot-notation injection) and strips obvious raw
// HTML tags from string values at the API edge — a lightweight
// defense-in-depth measure, not a replacement for output-side escaping.

const XSS_TAG_PATTERN = /<\/?\w+\s*[^>]*>/g;

function sanitizeValue(value) {
  if (typeof value === "string") {
    return value.replace(XSS_TAG_PATTERN, "");
  }
  return value;
}

function sanitizeObject(input) {
  if (input === null || typeof input !== "object") {
    return sanitizeValue(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(input)) {
    let safeKey = key;
    if (safeKey.startsWith("$")) {
      safeKey = safeKey.substring(1);
      console.warn("[Sanitizer] Suspicious NoSQL key starting with '$' detected and removed.");
    }
    safeKey = safeKey.replace(/\./g, "_");

    // Never sanitize password fields — HTML-tag stripping could alter a
    // genuinely valid password.
    sanitized[safeKey] = key.toLowerCase().includes("password") ? value : sanitizeObject(value);
  }
  return sanitized;
}

// req.query is a getter-only accessor under Express 5 — reassigning it is
// a silent no-op, not an error, so it must be mutated in place instead.
function replaceInPlace(target, sanitized) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, sanitized);
}

function sanitizeRequest(req, res, next) {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    if (req.query) {
      replaceInPlace(req.query, sanitizeObject(req.query));
    }
    return next();
  } catch (error) {
    console.error("[Sanitizer] Error processing request:", error);
    return next(error);
  }
}

module.exports = sanitizeRequest;
module.exports.sanitizeValue = sanitizeValue;
module.exports.sanitizeObject = sanitizeObject;
