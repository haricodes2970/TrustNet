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

// Phase 16B: gates the KYC submission flow specifically (document upload,
// submit), not login/general API access - the intended workflow is
// "Email Verified -> User uploads Government ID," and nothing previously
// enforced that ordering. This is a different, narrower gate than
// requireApprovedVerification above (which requires full KYC approval,
// applied to `/dashboard`) and does not affect login gating, which Phase
// 16A deliberately left unchanged - see BACKLOG.md.
async function requireVerifiedEmail(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("emailVerified");
    if (!user) throw new ApiError(401, "Authentication is no longer valid.");
    if (!user.emailVerified) {
      throw new ApiError(403, "Verify your email address before submitting Government ID verification.");
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireApprovedVerification, requireVerifiedEmail };
