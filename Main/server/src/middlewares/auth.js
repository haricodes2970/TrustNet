const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const jwtConfig = require("../config/jwt");

function authenticate(req, res, next) {
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

    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { authenticate };
