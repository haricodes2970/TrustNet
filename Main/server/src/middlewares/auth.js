const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const jwtConfig = require("../config/jwt");
const User = require("../models/User");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      throw new ApiError(401, "Authentication token is missing.");
    }

    let payload;
    try {
      payload = jwt.verify(token, jwtConfig.accessSecret);
    } catch (err) {
      throw new ApiError(401, "Invalid or expired authentication token.");
    }

    if (!payload || !payload.email) {
      throw new ApiError(401, "Invalid authentication token.");
    }

    // Checked on every request (not just at login) so an admin suspending
    // or soft-deleting a user takes effect immediately, not just on the
    // user's next token refresh.
    const account = await User.findById(payload.sub).select("isActive deletedAt");
    if (!account || account.deletedAt) {
      throw new ApiError(401, "Authentication is no longer valid.");
    }
    if (account.isActive === false) {
      throw new ApiError(403, "This account has been suspended.");
    }

    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { authenticate };
