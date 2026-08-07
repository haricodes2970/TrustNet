const ServiceListing = require("../models/ServiceListing");
const ProviderProfile = require("../models/ProviderProfile");
const providerProfileService = require("./providerProfileService");
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

// Case-insensitive, per-provider, active listings only — same reasoning as
// startupService.assertNoDuplicateName: a provider republishing under a
// deliberately reused title after archiving the original is allowed (not a
// duplicate submission), only two simultaneously-active listings sharing a
// title are blocked.
async function assertNoDuplicateTitle(providerId, title) {
  const escaped = title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await ServiceListing.findOne({
    provider: providerId,
    isArchived: false,
    deletedAt: null,
    title: new RegExp(`^${escaped}$`, "i"),
  }).lean();

  if (existing) {
    throw new ApiError(409, "You already have a service listing with this title.");
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
    await assertNoDuplicateTitle(profile._id, title);

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
// who isn't its owning provider or a platform admin — existence is
// concealed, not just content. Also conceals a listing whose provider's
// underlying account has been suspended/deleted (see providerProfileService
// - a provider has no isSuspended/deletedAt of its own, this reuses the
// User-level flags), covering the "archived/deleted provider" edge case
// without adding a parallel state field to ServiceListing.
async function getListingForViewer(id, userId, { isAdmin = false } = {}) {
  try {
    const listing = await getListingById(id);
    if (isAdmin) {
      return listing;
    }

    const isOwner = userId ? await resolveProviderOwnership(listing, userId) : false;
    if (isOwner) {
      return listing;
    }

    const isPubliclyVisible =
      listing.status === "published" && !listing.isArchived && !listing.isHidden && !listing.deletedAt;
    if (isPubliclyVisible && (await providerProfileService.isProviderAccountActiveById(listing.provider))) {
      return listing;
    }

    throw new ApiError(404, "Service listing not found.");
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch service listing.");
  }
}

// "Downgrade to public subset" on an unauthorized/absent filter, same
// pattern jobService.listJobsForUser uses. Platform admin sees everything
// unfiltered. The public subset additionally excludes listings whose
// provider account is suspended/deleted.
async function listListingsForUser(userId, filter = {}, options = {}, { isAdmin = false } = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { ...rest };
    const andClauses = [];

    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      andClauses.push({ $or: [{ title: regex }, { description: regex }, { tags: regex }] });
    }

    if (!isAdmin) {
      const ownProfile = userId ? await ProviderProfile.findOne({ user: userId }).lean() : null;

      if (base.provider) {
        const isOwnProvider = ownProfile && String(ownProfile._id) === String(base.provider);
        if (!isOwnProvider) {
          const inactiveProviderIds = await providerProfileService.listInactiveProviderIds();
          if (inactiveProviderIds.some((id) => String(id) === String(base.provider))) {
            return [];
          }
          base.status = "published";
          base.isArchived = false;
          base.isHidden = false;
          base.deletedAt = null;
        }
      } else {
        const inactiveProviderIds = await providerProfileService.listInactiveProviderIds();
        if (ownProfile) {
          andClauses.push({
            $or: [
              { status: "published", isArchived: false, isHidden: false, deletedAt: null, provider: { $nin: inactiveProviderIds } },
              { provider: ownProfile._id, deletedAt: null },
            ],
          });
        } else {
          base.status = "published";
          base.isArchived = false;
          base.isHidden = false;
          base.deletedAt = null;
          base.provider = { $nin: inactiveProviderIds };
        }
      }
    }

    if (andClauses.length > 0) {
      base.$and = [...(base.$and || []), ...andClauses];
    }

    const query = ServiceListing.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list service listings.");
  }
}

async function updateListing(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getListingById(id);
    if (!isAdmin) {
      const isOwner = await resolveProviderOwnership(existing, userId);
      if (!isOwner) {
        throw new ApiError(403, "You are not authorized to update this service listing.");
      }
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

    if (safeUpdate.title && safeUpdate.title.trim().toLowerCase() !== existing.title.trim().toLowerCase()) {
      await assertNoDuplicateTitle(existing.provider, safeUpdate.title);
    }

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

async function archiveListing(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getListingById(id);
    if (!isAdmin) {
      const isOwner = await resolveProviderOwnership(existing, userId);
      if (!isOwner) {
        throw new ApiError(403, "You are not authorized to archive this service listing.");
      }
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

// New this phase - isArchived existed on the schema with no counterpart to
// undo it, same gap class fundingRoundService.archiveRound/restoreRound
// closed for FundingRound. Restore is blocked (for non-admins) while
// deletedAt is set, since that field is exclusively the admin-moderation
// "delete" action (adminModerationService) - a provider can't self-service
// undo a platform admin's moderation decision through this endpoint.
async function restoreListing(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getListingById(id);
    if (!isAdmin) {
      const isOwner = await resolveProviderOwnership(existing, userId);
      if (!isOwner) {
        throw new ApiError(403, "You are not authorized to restore this service listing.");
      }
      if (existing.deletedAt) {
        throw new ApiError(409, "This listing was removed by a platform administrator and cannot be restored here.");
      }
    }

    const listing = await ServiceListing.findByIdAndUpdate(
      id,
      { isArchived: false, updatedBy: userId },
      { new: true }
    ).lean();

    if (!listing) {
      throw new ApiError(404, "Service listing not found.");
    }
    return listing;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore service listing.");
  }
}

async function publishListing(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getListingById(id);
    if (!isAdmin) {
      const isOwner = await resolveProviderOwnership(existing, userId);
      if (!isOwner) {
        throw new ApiError(403, "You are not authorized to publish this service listing.");
      }
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

async function unpublishListing(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getListingById(id);
    if (!isAdmin) {
      const isOwner = await resolveProviderOwnership(existing, userId);
      if (!isOwner) {
        throw new ApiError(403, "You are not authorized to unpublish this service listing.");
      }
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
  assertNoDuplicateTitle,
  createListing,
  getListingById,
  getListingForViewer,
  listListingsForUser,
  updateListing,
  archiveListing,
  restoreListing,
  publishListing,
  unpublishListing,
};
