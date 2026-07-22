const ServiceListing = require("../models/ServiceListing");
const ProviderProfile = require("../models/ProviderProfile");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// ServiceListing belongs to ProviderProfile (ProviderProfile -> Service-
// Listing), independent of Startup entirely. Flat User ownership only —
// resolved via the parent ProviderProfile.user, no resolveStartupAccess()
// involved anywhere in this file, per explicit instruction. Mirrors
// jobService.js's public/private shape (draft/published/archived,
// publish-time strictness, 404-concealment on view) but with flat
// ownership standing in for Startup-role authorization.
//
// Error typing: 404 not found, 403 ownership failure, 409 state conflict
// (missing provider profile, invalid publish state, archived). Malformed
// input is rejected by validators (400) before reaching this file.

async function resolveProviderOwnership(listing, userId) {
  const profile = await ProviderProfile.findById(listing.provider).lean();
  if (!profile) {
    return false;
  }
  return String(profile.user) === String(userId);
}

// Pure, database-independent.
function validatePriceRange(priceMin, priceMax) {
  if (priceMin != null && priceMax != null && Number(priceMin) > Number(priceMax)) {
    throw new ApiError(400, "priceMin must be less than or equal to priceMax.");
  }
}

// Pure, database-independent. Publishing requires the content fields a
// draft is allowed to skip, and the listing must not be archived.
function assertPublishReady(listing) {
  if (listing.isArchived) {
    throw new ApiError(409, "Archived listings cannot be published.");
  }
  const missing = ["title", "description", "category", "pricingModel"].filter((field) => !listing[field]);
  if (missing.length > 0) {
    throw new ApiError(409, `Cannot publish: missing required field(s): ${missing.join(", ")}.`);
  }
}

async function createListing(
  { title, category, description, pricingModel, priceMin, priceMax, currency, tags },
  userId
) {
  try {
    const profile = await ProviderProfile.findOne({ user: userId }).lean();
    if (!profile) {
      throw new ApiError(409, "You must create a provider profile before creating a listing.");
    }

    validatePriceRange(priceMin, priceMax);

    const listing = await ServiceListing.create({
      provider: profile._id,
      title,
      category,
      description,
      pricingModel,
      priceMin,
      priceMax,
      currency,
      tags,
      createdBy: userId,
    });

    return listing.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create service listing.");
  }
}

async function getListingById(id) {
  try {
    const listing = await ServiceListing.findById(id).lean();
    if (!listing) {
      throw new ApiError(404, "Service listing not found.");
    }
    return listing;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch service listing.");
  }
}

// Same concealment convention jobService.assertJobViewAccess established:
// a listing that isn't publicly visible returns 404 (not 403) to anyone
// who isn't its owning provider, including anonymous visitors — existence
// is concealed, not just content.
async function getListingForViewer(id, userId) {
  try {
    const listing = await getListingById(id);
    const isPubliclyVisible = listing.status === "published" && !listing.isArchived;
    if (isPubliclyVisible) {
      return listing;
    }

    if (!userId) {
      throw new ApiError(404, "Service listing not found.");
    }

    const isOwner = await resolveProviderOwnership(listing, userId);
    if (!isOwner) {
      throw new ApiError(404, "Service listing not found.");
    }
    return listing;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch service listing.");
  }
}

// "Downgrade to public subset" on an unauthorized/absent filter, same
// pattern jobService.listJobsForUser uses.
async function listListingsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);
    const ownProfile = userId ? await ProviderProfile.findOne({ user: userId }).lean() : null;

    if (base.provider) {
      const isOwnProvider = ownProfile && String(ownProfile._id) === String(base.provider);
      if (!isOwnProvider) {
        base.status = "published";
        base.isArchived = false;
      }
    } else if (ownProfile) {
      base.$or = [
        { status: "published", isArchived: false },
        { provider: ownProfile._id },
      ];
    } else {
      base.status = "published";
      base.isArchived = false;
    }

    const query = ServiceListing.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list service listings.");
  }
}

async function updateListing(id, userId, updateData) {
  try {
    const existing = await getListingById(id);
    const isOwner = await resolveProviderOwnership(existing, userId);
    if (!isOwner) {
      throw new ApiError(403, "You are not authorized to update this service listing.");
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.provider;
    delete safeUpdate.createdBy;
    delete safeUpdate.isArchived;
    delete safeUpdate.status; // status changes only via publish/unpublish

    const mergedMin = Object.prototype.hasOwnProperty.call(safeUpdate, "priceMin")
      ? safeUpdate.priceMin
      : existing.priceMin;
    const mergedMax = Object.prototype.hasOwnProperty.call(safeUpdate, "priceMax")
      ? safeUpdate.priceMax
      : existing.priceMax;
    validatePriceRange(mergedMin, mergedMax);

    safeUpdate.updatedBy = userId;

    const listing = await ServiceListing.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!listing) {
      throw new ApiError(404, "Service listing not found.");
    }
    return listing;
  } catch (error) {
    throw handleServiceError(error, "Failed to update service listing.");
  }
}

async function archiveListing(id, userId) {
  try {
    const existing = await getListingById(id);
    const isOwner = await resolveProviderOwnership(existing, userId);
    if (!isOwner) {
      throw new ApiError(403, "You are not authorized to archive this service listing.");
    }

    const listing = await ServiceListing.findByIdAndUpdate(
      id,
      { isArchived: true, updatedBy: userId },
      { new: true }
    ).lean();

    if (!listing) {
      throw new ApiError(404, "Service listing not found.");
    }
    return listing;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive service listing.");
  }
}

async function publishListing(id, userId) {
  try {
    const existing = await getListingById(id);
    const isOwner = await resolveProviderOwnership(existing, userId);
    if (!isOwner) {
      throw new ApiError(403, "You are not authorized to publish this service listing.");
    }

    assertPublishReady(existing);

    const listing = await ServiceListing.findByIdAndUpdate(
      id,
      { status: "published", updatedBy: userId },
      { new: true }
    ).lean();

    if (!listing) {
      throw new ApiError(404, "Service listing not found.");
    }
    return listing;
  } catch (error) {
    throw handleServiceError(error, "Failed to publish service listing.");
  }
}

async function unpublishListing(id, userId) {
  try {
    const existing = await getListingById(id);
    const isOwner = await resolveProviderOwnership(existing, userId);
    if (!isOwner) {
      throw new ApiError(403, "You are not authorized to unpublish this service listing.");
    }

    const listing = await ServiceListing.findByIdAndUpdate(
      id,
      { status: "draft", updatedBy: userId },
      { new: true }
    ).lean();

    if (!listing) {
      throw new ApiError(404, "Service listing not found.");
    }
    return listing;
  } catch (error) {
    throw handleServiceError(error, "Failed to unpublish service listing.");
  }
}

module.exports = {
  resolveProviderOwnership,
  validatePriceRange,
  assertPublishReady,
  createListing,
  getListingById,
  getListingForViewer,
  listListingsForUser,
  updateListing,
  archiveListing,
  publishListing,
  unpublishListing,
};
