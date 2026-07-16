const User = require("../models/User");
const ApiError = require("../utils/ApiError");

// Role-based authorization guard. Must run AFTER `authenticate`, which sets
// `req.user.id`. Loads only the `role` field and allows the request when the
// user's role is in the permitted list; otherwise returns 403.
function authorize(...roles) {
  return async function authorizeMiddleware(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        throw new ApiError(401, "Authentication is required.");
      }

      const user = await User.findById(req.user.id).select("role");
      if (!user) {
        throw new ApiError(401, "Authentication is no longer valid.");
      }

      if (roles.length && !roles.includes(user.role)) {
        throw new ApiError(403, "You are not authorized to perform this action.");
      }

      req.user.role = user.role;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { authorize };
