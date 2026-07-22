const EngagementRequest = require("../models/EngagementRequest");
const Startup = require("../models/Startup");
const Team = require("../models/Team");
const ApiError = require("../utils/ApiError");
const serviceListingService = require("./serviceListingService");
const { handleServiceError, normalizeFilter, applyQueryOptions } = require("./serviceUtils");

// EngagementRequest -> ServiceListing (provider side, flat ownership,
// reused via serviceListingService) and EngagementRequest -> Startup
// (requester side, Startup-role authorization). resolveStartupAccess()
// below is a FIFTH deliberate, known duplication of the founder/admin/
// contributor role-computation logic already implemented separately in
// workspaceService.resolveWorkspaceAccess(), jobService.resolveStartupAccess(),
// investmentInterestService.resolveStartupAccess(), and
// fundingRoundService.resolveStartupAccess(). Not shared with any of them
// by explicit instruction — none of those four files are touched here.
// This is the first resource in this codebase requiring TWO independent
// authority mechanisms simultaneously: Startup-role for the requester side,
// flat User ownership (via serviceListingService.resolveProviderOwnership)
// for the fulfiller side. See docs/modules/marketplace.md and BACKLOG.md.
//
// Error typing: 404 not found, 403 authorization failure, 409 state
// conflict (listing not published, duplicate request, terminal-state
// block, invalid transition). Malformed input is rejected by validators
// (400) before reaching here.

async function resolveStartupAccess(startupId, userId) {
  const startup = await Startup.findById(startupId).lean();
  if (!startup) {
    return { role: null };
  }

  if (String(startup.founder) === String(userId)) {
    return { role: "owner" };
  }

  const team = await Team.findOne({ startup: startupId }).lean();
  if (!team) {
    return { role: null };
  }

  const member = team.members.find(
    (m) => m.user && String(m.user) === String(userId) && m.status === "active"
  );

  if (!member) {
    return { role: null };
  }

  return { role: member.role === "admin" ? "admin" : "contributor" };
}

const TERMINAL_STATUSES = ["declined", "completed", "cancelled"];
const ALLOWED_TRANSITIONS = {
  requested: ["accepted", "declined", "cancelled"],
  accepted: ["in_progress", "declined", "cancelled"],
  in_progress: ["completed"],
};

// Pure, database-independent. A lookup-table implementation (not a linear
// forward-path array) since two different actors can exit from two
// different non-terminal states — kept separate from every other module's
// transition helper, per the project's standing convention.
function assertValidEngagementTransition(currentStatus, nextStatus) {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new ApiError(409, `Engagement request is in a terminal state ("${currentStatus}") and cannot transition.`);
  }
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(409, `Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
  }
}

async function resolveRequestRole(request, userId) {
  const startupAccess = await resolveStartupAccess(request.startup, userId);
  if (startupAccess.role) {
    return startupAccess.role;
  }
  const listing = await serviceListingService.getListingById(request.serviceListing);
  const isProvider = await serviceListingService.resolveProviderOwnership(listing, userId);
  return isProvider ? "provider" : null;
}

async function createRequest({ serviceListingId, startupId, message }, userId) {
  try {
    const listing = await serviceListingService.getListingById(serviceListingId);
    if (listing.status !== "published" || listing.isArchived) {
      throw new ApiError(409, "This service listing is not currently accepting engagement requests.");
    }

    const access = await resolveStartupAccess(startupId, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to request engagement on behalf of this startup.");
    }

    const existing = await EngagementRequest.findOne({
      serviceListing: serviceListingId,
      startup: startupId,
      status: { $nin: ["declined", "cancelled", "completed"] },
    }).lean();
    if (existing) {
      throw new ApiError(409, "This startup already has an active engagement request for this listing.");
    }

    const request = await EngagementRequest.create({
      serviceListing: serviceListingId,
      startup: startupId,
      message,
      createdBy: userId,
    });

    return request.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "This startup already has an active engagement request for this listing.");
    }
    throw handleServiceError(error, "Failed to submit engagement request.");
  }
}

async function getRequestById(id) {
  try {
    const request = await EngagementRequest.findById(id).lean();
    if (!request) {
      throw new ApiError(404, "Engagement request not found.");
    }
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch engagement request.");
  }
}

async function getRequestForViewer(id, userId) {
  try {
    const request = await getRequestById(id);
    const role = await resolveRequestRole(request, userId);
    if (!role) {
      throw new ApiError(403, "You are not authorized to view this engagement request.");
    }
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch engagement request.");
  }
}

// Two independent filter axes — ?startup= for the requester side, ?service
// Listing= for the provider side — each downgrading to "my own submissions"
// (via createdBy) when the caller has no role on that axis. No filter at
// all also scopes to createdBy: userId. "Scope, don't reject" throughout,
// same convention every prior list-scoped module uses.
async function listRequestsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);

    if (base.startup) {
      const access = await resolveStartupAccess(base.startup, userId);
      if (!access.role) {
        base.createdBy = userId;
      }
    } else if (base.serviceListing) {
      const listing = await serviceListingService.getListingById(base.serviceListing);
      const isProvider = await serviceListingService.resolveProviderOwnership(listing, userId);
      if (!isProvider) {
        base.createdBy = userId;
      }
    } else {
      base.createdBy = userId;
    }

    const query = EngagementRequest.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list engagement requests.");
  }
}

// Provider-only: accept / decline / start / complete, via a single
// staff-settable-style endpoint, same shape investmentInterestService's
// updateStatus uses.
async function updateStatus(id, userId, { status }) {
  try {
    const existing = await getRequestById(id);
    const listing = await serviceListingService.getListingById(existing.serviceListing);
    const isProvider = await serviceListingService.resolveProviderOwnership(listing, userId);
    if (!isProvider) {
      throw new ApiError(403, "You are not authorized to update this engagement request's status.");
    }

    assertValidEngagementTransition(existing.status, status);

    const request = await EngagementRequest.findByIdAndUpdate(
      id,
      { status, updatedBy: userId },
      { new: true, runValidators: true }
    ).lean();

    if (!request) {
      throw new ApiError(404, "Engagement request not found.");
    }
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to update engagement request status.");
  }
}

// Startup owner/admin-only: cancel their own request, from requested/
// accepted only.
async function cancelRequest(id, userId) {
  try {
    const existing = await getRequestById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to cancel this engagement request.");
    }

    assertValidEngagementTransition(existing.status, "cancelled");

    const request = await EngagementRequest.findByIdAndUpdate(
      id,
      { status: "cancelled", updatedBy: userId },
      { new: true }
    ).lean();

    if (!request) {
      throw new ApiError(404, "Engagement request not found.");
    }
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to cancel engagement request.");
  }
}

module.exports = {
  resolveStartupAccess,
  assertValidEngagementTransition,
  resolveRequestRole,
  createRequest,
  getRequestById,
  getRequestForViewer,
  listRequestsForUser,
  updateStatus,
  cancelRequest,
};
