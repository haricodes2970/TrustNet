const User = require("../models/User");
const ApiError = require("../utils/ApiError");

async function requireApprovedVerification(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("verificationStatus");
    if (!user) throw new ApiError(401, "Authentication is no longer valid.");
    if (user.verificationStatus !== "approved") {
      throw new ApiError(403, "Account verification is required before using TrustNet.");
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireApprovedVerification };
