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
// a future dedicated refactor.
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

async function resolveInterestRole(interest, userId) {
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
    if (!startup) {
      throw new ApiError(404, "Startup not found.");
    }
    if (startup.status !== "active") {
      throw new ApiError(409, "This startup is not currently accepting investment interest.");
    }

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

async function getInterestForViewer(id, userId) {
  try {
    const interest = await getInterestById(id);
    const role = await resolveInterestRole(interest, userId);
    if (!role) {
      throw new ApiError(403, "You are not authorized to view this investment interest.");
    }
    return interest;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch investment interest.");
  }
}

// No public tier, unlike Job — every result is scoped so the caller never
// sees anything beyond what's rightfully theirs. Startup owner/admin/
// contributor see the full roster only when they explicitly filter by a
// startup they have a role on; every other case (including an investor,
// or staff with no filter) is scoped to "my own expressed interests only."
async function listInterestsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);

    if (base.startup) {
      const access = await resolveStartupAccess(base.startup, userId);
      if (!access.role) {
        base.investor = userId;
      }
      // owner/admin/contributor: no further restriction, see the full roster.
    } else {
      base.investor = userId;
    }

    const query = InvestmentInterest.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list investment interests.");
  }
}

async function updateStatus(id, userId, { status }) {
  try {
    const existing = await getInterestById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to update this investment interest's status.");
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

async function archiveInterest(id, userId) {
  try {
    const existing = await getInterestById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to archive this investment interest.");
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

async function withdraw(id, userId) {
  try {
    const existing = await getInterestById(id);
    assertOwner(existing.investor, userId, "You are not authorized to withdraw this investment interest.", 403);

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
  resolveInterestRole,
  createInterest,
  getInterestById,
  getInterestForViewer,
  listInterestsForUser,
  updateStatus,
  archiveInterest,
  withdraw,
};
