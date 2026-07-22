const ProviderProfile = require("../models/ProviderProfile");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter, assertOwner } = require("./serviceUtils");

// Provider profiles are a public directory (list/get, no auth) — only
// create/update require ownership. Flat User ownership only, no Startup
// relationship at all — providers are individual Users, not Startups, so
// no resolveStartupAccess() is needed or introduced here.
//
// Error typing: 404 not found, 403 ownership failure, 409 state conflict
// (duplicate profile). Malformed input is rejected by validators (400)
// before reaching this file.

async function createProfile(
  { businessName, tagline, description, serviceCategories, portfolioUrl },
  userId
) {
  try {
    const existing = await ProviderProfile.findOne({ user: userId }).lean();
    if (existing) {
      throw new ApiError(409, "You already have a provider profile.");
    }

    const profile = await ProviderProfile.create({
      user: userId,
      businessName,
      tagline,
      description,
      serviceCategories,
      portfolioUrl,
      createdBy: userId,
    });

    return profile.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "You already have a provider profile.");
    }
    throw handleServiceError(error, "Failed to create provider profile.");
  }
}

async function getProfileById(id) {
  try {
    const profile = await ProviderProfile.findById(id).lean();
    if (!profile) {
      throw new ApiError(404, "Provider profile not found.");
    }
    return profile;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch provider profile.");
  }
}

async function listProfiles(filter = {}, options = {}) {
  try {
    const query = ProviderProfile.find(normalizeFilter(filter));
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list provider profiles.");
  }
}

async function updateProfile(id, userId, updateData) {
  try {
    const existing = await getProfileById(id);
    assertOwner(existing.user, userId, "You are not authorized to update this provider profile.", 403);

    const safeUpdate = { ...updateData };
    delete safeUpdate.user;
    delete safeUpdate.createdBy;
    safeUpdate.updatedBy = userId;

    const profile = await ProviderProfile.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!profile) {
      throw new ApiError(404, "Provider profile not found.");
    }
    return profile;
  } catch (error) {
    throw handleServiceError(error, "Failed to update provider profile.");
  }
}

module.exports = {
  createProfile,
  getProfileById,
  listProfiles,
  updateProfile,
};
