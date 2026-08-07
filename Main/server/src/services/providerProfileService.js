const ProviderProfile = require("../models/ProviderProfile");
const User = require("../models/User");
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

// A provider has no isSuspended/deletedAt of its own — reuses the
// underlying User's existing isActive/deletedAt (already the platform's
// one suspend/delete mechanism, set via adminUserService.suspendUser/
// softDeleteUser) instead of duplicating a parallel flag on ProviderProfile.
// Same reasoning the model comment already gives for not duplicating
// verificationStatus.
function isAccountActive(user) {
  return Boolean(user) && user.isActive !== false && !user.deletedAt;
}

// 404, not 403/409 — same concealment convention as
// serviceListingService.getListingForViewer: a suspended/deleted provider's
// profile is hidden, not flagged, from anyone but its owner or a platform
// admin.
async function assertProfileViewAccess(profile, viewer = {}) {
  const isOwner = viewer.id && String(profile.user) === String(viewer.id);
  const isAdmin = viewer.role === "admin";
  if (isOwner || isAdmin) {
    return;
  }
  const account = await User.findById(profile.user).select("isActive deletedAt").lean();
  if (!isAccountActive(account)) {
    throw new ApiError(404, "Provider profile not found.");
  }
}

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

// Wraps getProfileById with view-concealment plus "verification awareness":
// enriches the response with the linked User's isVerified/verificationStatus
// (reuses User.verificationStatus per the model's own design note, rather
// than exposing a parallel field) without changing the shape of `user`.
async function getProfileForViewer(id, viewer = {}) {
  try {
    const profile = await getProfileById(id);
    await assertProfileViewAccess(profile, viewer);
    const account = await User.findById(profile.user).select("isVerified verificationStatus").lean();
    return {
      ...profile,
      verification: account ? { isVerified: account.isVerified, verificationStatus: account.verificationStatus } : null,
    };
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch provider profile.");
  }
}

// Default-excludes profiles whose owning account is suspended/deleted from
// the public directory, same "explicit filter overrides the default"
// pattern startupService.listStartups uses — an explicit `user` filter or
// the platform-admin override both skip it. Also attaches `verification`,
// same shape as getProfileForViewer.
async function listProfiles(filter = {}, options = {}, { isAdmin = false } = {}) {
  try {
    const base = normalizeFilter(filter);
    if (!isAdmin && base.user === undefined) {
      const inactiveUserIds = await User.find({ $or: [{ isActive: false }, { deletedAt: { $ne: null } }] }).distinct("_id");
      if (inactiveUserIds.length > 0) {
        base.user = { $nin: inactiveUserIds };
      }
    }

    const query = ProviderProfile.find(base).populate({ path: "user", select: "isVerified verificationStatus" });
    const profiles = await applyQueryOptions(query, options).lean();
    return profiles.map((profile) => ({
      ...profile,
      verification: profile.user ? { isVerified: profile.user.isVerified, verificationStatus: profile.user.verificationStatus } : null,
      user: profile.user ? profile.user._id : profile.user,
    }));
  } catch (error) {
    throw handleServiceError(error, "Failed to list provider profiles.");
  }
}

async function updateProfile(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getProfileById(id);
    if (!isAdmin) {
      assertOwner(existing.user, userId, "You are not authorized to update this provider profile.", 403);
    }

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

// Reused by serviceListingService/engagementRequestService (the fulfiller
// side of ServiceListing/EngagementRequest) instead of each re-deriving
// account status from ProviderProfile.user independently — this is the
// canonical owner of Provider-related state, so importing it is reuse, not
// the kind of duplication the codebase's resolveStartupAccess() pattern
// deliberately keeps separate.
async function isProviderAccountActiveById(providerProfileId) {
  const profile = await ProviderProfile.findById(providerProfileId).select("user").lean();
  if (!profile) {
    return false;
  }
  const account = await User.findById(profile.user).select("isActive deletedAt").lean();
  return isAccountActive(account);
}

async function listInactiveProviderIds() {
  const inactiveUserIds = await User.find({ $or: [{ isActive: false }, { deletedAt: { $ne: null } }] }).distinct("_id");
  if (inactiveUserIds.length === 0) {
    return [];
  }
  return ProviderProfile.find({ user: { $in: inactiveUserIds } }).distinct("_id");
}

module.exports = {
  createProfile,
  getProfileForViewer,
  isProviderAccountActiveById,
  listInactiveProviderIds,
  getProfileById,
  listProfiles,
  updateProfile,
};
