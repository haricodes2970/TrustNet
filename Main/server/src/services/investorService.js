const InvestorProfile = require("../models/InvestorProfile");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter, assertOwner } = require("./serviceUtils");

// Investor profiles are a public directory (list/get, no auth) — only
// create/update require ownership. No Startup relationship at all here;
// Startup-authority logic lives entirely in investmentInterestService.js.
//
// Error typing: 404 not found, 403 ownership failure, 409 state conflict
// (duplicate profile). Malformed input is rejected by validators (400)
// before reaching this file. Matches the typed-ApiError convention used by
// applicationService/documentService.

async function createProfile(
  { organization, investmentThesis, preferredStages, preferredIndustries, preferredRegions },
  userId
) {
  try {
    const existing = await InvestorProfile.findOne({ user: userId }).lean();
    if (existing) {
      throw new ApiError(409, "You already have an investor profile.");
    }

    const profile = await InvestorProfile.create({
      user: userId,
      organization,
      investmentThesis,
      preferredStages,
      preferredIndustries,
      preferredRegions,
      createdBy: userId,
    });

    return profile.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "You already have an investor profile.");
    }
    throw handleServiceError(error, "Failed to create investor profile.");
  }
}

async function getProfileById(id) {
  try {
    const profile = await InvestorProfile.findById(id).lean();
    if (!profile) {
      throw new ApiError(404, "Investor profile not found.");
    }
    return profile;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch investor profile.");
  }
}

async function listProfiles(filter = {}, options = {}) {
  try {
    const query = InvestorProfile.find(normalizeFilter(filter));
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list investor profiles.");
  }
}

async function updateProfile(id, userId, updateData) {
  try {
    const existing = await getProfileById(id);
    assertOwner(existing.user, userId, "You are not authorized to update this investor profile.", 403);

    const safeUpdate = { ...updateData };
    delete safeUpdate.user;
    delete safeUpdate.createdBy;
    safeUpdate.updatedBy = userId;

    const profile = await InvestorProfile.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!profile) {
      throw new ApiError(404, "Investor profile not found.");
    }

    return profile;
  } catch (error) {
    throw handleServiceError(error, "Failed to update investor profile.");
  }
}

module.exports = {
  createProfile,
  getProfileById,
  listProfiles,
  updateProfile,
};
