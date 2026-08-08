const { normalizeMongooseError } = require('../services/serviceUtils');

// Phase 17 (final audit): a raw Mongoose error reaching this handler was
// relayed to the client verbatim as `message`, leaking internal model
// names and query internals (e.g. `Cast to ObjectId failed for value "abc"
// (type string) at path "_id" for model "Project"`) under a 500. Mongoose
// error types are now normalized to a clean status + message via the same
// helper the service layer uses, so both the `next(error)` path and the
// `catch` -> `error.message` path behave identically.
//
// A 5xx never relays the underlying message outside development - an
// unexpected internal failure must not become an information-disclosure
// channel. 4xx messages are deliberate, caller-facing, and always relayed.
module.exports = (err, req, res, next) => {
  console.error(err);

  const error = normalizeMongooseError(err) || err;
  const statusCode = error.statusCode || 500;
  const isServerError = statusCode >= 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    message: isServerError && !isDev ? 'Internal Server Error' : error.message || 'Internal Server Error',
    details: error.details && Object.keys(error.details).length ? error.details : undefined,
    stack: isDev ? error.stack : undefined,
  });
};
