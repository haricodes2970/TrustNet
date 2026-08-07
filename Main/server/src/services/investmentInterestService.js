const InvestmentInterest = require("../models/InvestmentInterest");
const Startup = require("../models/Startup");
const Team = require("../models/Team");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { handleServiceError, normalizeFilter, applyQueryOptions, assertOwner } = require("./serviceUtils");

// Investor -> InvestmentInterest -> Startup. Independent of Workspace and
// independent of Hiring — this is a THIRD, deliberately duplicated
// implementation of the founder/admin/contributor role logic that already
// exists in workspaceService.resolveWorkspaceAccess() and (separately) in
// jobService.resolveStartupAccess(). This is an explicit, instructed
// decision, not an oversight: workspaceService.js and jobService.js are
// both left untouched, no shared authorization service was introduced. See
// docs/modules/investors.md and BACKLOG.md for the standing note that this
// is now the third instance of this duplication, the clearest case yet for
// a future dedicated refactor. Re-verified during the Investors & Funding
// phase audit — still intentional, still documented, left unchanged.
//
// Error typing: 404 not found, 403 authorization failure (role/ownership,
// including the acting user's own inactive-account check), 409 state
// conflict (duplicate interest, terminal-state block, invalid transition).
// Malformed input is rejected by validators (400) before reaching here.

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

const TERMINAL_STATUSES = ["accepted", "declined", "withdrawn"];
const FORWARD_PATH = ["submitted", "reviewing", "contacted", "accepted"];

// Pure, database-independent. Kept separate from applicationService's
// assertValidStatusTransition — same shape, different domain, same
// reasoning that kept canMutateDocument separate from canMutateTask.
function assertValidInterestTransition(currentStatus, nextStatus) {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new ApiError(409, `Investment interest is in a terminal state ("${currentStatus}") and cannot transition.`);
  }
  if (nextStatus === "declined") {
    return; // staff may decline from any non-terminal state
  }
  const currentIndex = FORWARD_PATH.indexOf(currentStatus);
  const nextIndex = FORWARD_PATH.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    throw new ApiError(409, `Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
  }
}

// Startup must exist, not be soft-deleted or admin-suspended, and be in the
// "active" lifecycle status — previously only the last of these three was
// checked, so a suspended or already-deleted startup (independent booleans/
// fields from `status`) could still receive brand-new investment interest.
function assertStartupAcceptingInterest(startup) {
  if (!startup) {
    throw new ApiError(404, "Startup not found.");
  }
  if (startup.deletedAt) {
    throw new ApiError(409, "This startup has been deleted and is not accepting investment interest.");
  }
  if (startup.isSuspended) {
    throw new ApiError(409, "This startup is suspended and is not accepting investment interest.");
  }
  if (startup.status !== "active") {
    throw new ApiError(409, "This startup is not currently accepting investment interest.");
  }
}

async function resolveInterestRole(interest, userId, { isAdmin = false } = {}) {
  if (isAdmin) {
    return "admin";
  }
  if (String(interest.investor) === String(userId)) {
    return "investor";
  }
  const access = await resolveStartupAccess(interest.startup, userId);
  // Unlike Applications, contributor IS granted access here — read-only,
  // per the approved permission model.
  return access.role || null;
}

async function createInterest({ startupId, message }, userId) {
  try {
    const startup = await Startup.findById(startupId).lean();
    assertStartupAcceptingInterest(startup);

    const user = await User.findById(userId).lean();
    if (!user || !user.isActive) {
      throw new ApiError(403, "Your account is not active.");
    }

    const existing = await InvestmentInterest.findOne({
      startup: startupId,
      investor: userId,
      status: { $ne: "withdrawn" },
    }).lean();
    if (existing) {
      throw new ApiError(409, "You have already expressed interest in this startup.");
    }

    const interest = await InvestmentInterest.create({
      startup: startupId,
      investor: userId,
      message,
      createdBy: userId,
    });

    return interest.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "You have already expressed interest in this startup.");
    }
    throw handleServiceError(error, "Failed to express investment interest.");
  }
}

async function getInterestById(id) {
  try {
    const interest = await InvestmentInterest.findById(id).lean();
    if (!interest) {
      throw new ApiError(404, "Investment interest not found.");
    }
    return interest;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch investment interest.");
  }
}

async function getInterestForViewer(id, userId, { isAdmin = false } = {}) {
  try {
    const interest = await getInterestById(id);
    const role = await resolveInterestRole(interest, userId, { isAdmin });
    if (!role) {
      throw new ApiError(403, "You are not authorized to view this investment interest.");
    }
    return interest;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch investment interest.");
  }
}

// isArchived defaults to excluded (override-friendly, same pattern as
// every collaboration-chain module's listing default) — previously an
// archived interest never left the default view. No public tier, unlike
// Job — every result is scoped so the caller never sees anything beyond
// what's rightfully theirs. Startup owner/admin/contributor (or a platform
// admin, same "targeted override" shape as every other module) see the
// full roster only when they explicitly filter by a startup they have a
// role on; every other case (including an investor, or staff with no
// filter) is scoped to "my own expressed interests only."
async function listInterestsForUser(userId, filter = {}, options = {}, { isAdmin = false } = {}) {
  try {
    const rest = normalizeFilter(filter);
    const base = { isArchived: false, ...rest };

    if (base.startup) {
      if (!isAdmin) {
        const access = await resolveStartupAccess(base.startup, userId);
        if (!access.role) {
          base.investor = userId;
        }
      }
      // owner/admin/contributor/platform-admin: no further restriction, see the full roster.
    } else {
      base.investor = userId;
    }

    const query = InvestmentInterest.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list investment interests.");
  }
}

async function updateStatus(id, userId, { status }, { isAdmin = false } = {}) {
  try {
    const existing = await getInterestById(id);
    if (!isAdmin) {
      const access = await resolveStartupAccess(existing.startup, userId);
      if (access.role !== "owner" && access.role !== "admin") {
        throw new ApiError(403, "You are not authorized to update this investment interest's status.");
      }
    }

    assertValidInterestTransition(existing.status, status);

    const interest = await InvestmentInterest.findByIdAndUpdate(
      id,
      { status, updatedBy: userId },
      { new: true, runValidators: true }
    ).lean();

    if (!interest) {
      throw new ApiError(404, "Investment interest not found.");
    }
    return interest;
  } catch (error) {
    throw handleServiceError(error, "Failed to update investment interest status.");
  }
}

async function archiveInterest(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getInterestById(id);
    if (!isAdmin) {
      const access = await resolveStartupAccess(existing.startup, userId);
      if (access.role !== "owner" && access.role !== "admin") {
        throw new ApiError(403, "You are not authorized to archive this investment interest.");
      }
    }

    const interest = await InvestmentInterest.findByIdAndUpdate(
      id,
      { isArchived: true, updatedBy: userId },
      { new: true }
    ).lean();

    if (!interest) {
      throw new ApiError(404, "Investment interest not found.");
    }
    return interest;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive investment interest.");
  }
}

async function restoreInterest(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getInterestById(id);
    if (!isAdmin) {
      const access = await resolveStartupAccess(existing.startup, userId);
      if (access.role !== "owner" && access.role !== "admin") {
        throw new ApiError(403, "You are not authorized to restore this investment interest.");
      }
    }

    const startup = await Startup.findById(existing.startup).lean();
    if (!startup || startup.deletedAt) {
      throw new ApiError(409, "Restore the startup before restoring its investment interests.");
    }

    const interest = await InvestmentInterest.findByIdAndUpdate(
      id,
      { isArchived: false, updatedBy: userId },
      { new: true }
    ).lean();

    if (!interest) {
      throw new ApiError(404, "Investment interest not found.");
    }
    return interest;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore investment interest.");
  }
}

async function withdraw(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getInterestById(id);
    if (!isAdmin) {
      assertOwner(existing.investor, userId, "You are not authorized to withdraw this investment interest.", 403);
    }

    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new ApiError(409, `Investment interest is in a terminal state ("${existing.status}") and cannot be withdrawn.`);
    }

    const interest = await InvestmentInterest.findByIdAndUpdate(
      id,
      { status: "withdrawn", updatedBy: userId },
      { new: true }
    ).lean();

    if (!interest) {
      throw new ApiError(404, "Investment interest not found.");
    }
    return interest;
  } catch (error) {
    throw handleServiceError(error, "Failed to withdraw investment interest.");
  }
}

module.exports = {
  resolveStartupAccess,
  assertValidInterestTransition,
  assertStartupAcceptingInterest,
  resolveInterestRole,
  createInterest,
  getInterestById,
  getInterestForViewer,
  listInterestsForUser,
  updateStatus,
  archiveInterest,
  restoreInterest,
  withdraw,
};
