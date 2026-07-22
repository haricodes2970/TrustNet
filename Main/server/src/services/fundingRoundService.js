const FundingRound = require("../models/FundingRound");
const Startup = require("../models/Startup");
const Team = require("../models/Team");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Funding is a Startup-domain module: Startup -> FundingRound -> Funding-
// Contribution, independent of Workspace/Project and independent of
// Investor (InvestorProfile/InvestmentInterest). resolveStartupAccess()
// below is a FOURTH deliberate, known duplication of the founder/admin/
// contributor role-computation logic already implemented separately in
// workspaceService.resolveWorkspaceAccess(), jobService.resolveStartupAccess(),
// and investmentInterestService.resolveStartupAccess(). Not shared with any
// of them by explicit instruction — none of those three files are touched
// here. See docs/modules/funding.md and BACKLOG.md.
//
// Error typing: 404 not found, 403 authorization failure (role/ownership),
// 409 state conflict (invalid transition, terminal-state block, startup not
// active). Malformed input is rejected by validators (400) before reaching
// here.

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

async function getAccessibleStartupIds(userId) {
  const founded = await Startup.find({ founder: userId }).select("_id").lean();
  const teams = await Team.find({ "members.user": userId, "members.status": "active" })
    .select("startup")
    .lean();

  const ids = [...founded.map((s) => s._id), ...teams.map((t) => t.startup)];
  const unique = new Map(ids.map((id) => [String(id), id]));
  return Array.from(unique.values());
}

const TERMINAL_ROUND_STATUSES = ["closed", "cancelled"];
const ALLOWED_ROUND_TRANSITIONS = {
  draft: ["open", "cancelled"],
  open: ["closed", "cancelled"],
};

// Pure, database-independent. Kept separate from
// investmentInterestService's/applicationService's transition helpers, same
// domain-per-file convention every prior module follows.
function assertValidRoundTransition(currentStatus, nextStatus) {
  if (TERMINAL_ROUND_STATUSES.includes(currentStatus)) {
    throw new ApiError(409, `Funding round is in a terminal state ("${currentStatus}") and cannot transition.`);
  }
  const allowed = ALLOWED_ROUND_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(409, `Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
  }
}

async function createRound(
  { startupId, title, roundType, targetAmount, currency, minimumContribution, description },
  userId
) {
  try {
    const startup = await Startup.findById(startupId).lean();
    if (!startup) {
      throw new ApiError(404, "Startup not found.");
    }

    const access = await resolveStartupAccess(startupId, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to create funding rounds for this startup.");
    }

    const round = await FundingRound.create({
      startup: startupId,
      title,
      roundType,
      targetAmount,
      currency,
      minimumContribution,
      description,
      createdBy: userId,
    });

    return round.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create funding round.");
  }
}

async function getRoundById(id) {
  try {
    const round = await FundingRound.findById(id).lean();
    if (!round) {
      throw new ApiError(404, "Funding round not found.");
    }
    return round;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch funding round.");
  }
}

// Same concealment convention jobService.assertJobViewAccess established:
// a round that isn't publicly visible returns 404 (not 403) to anyone
// without a role on its Startup, including anonymous visitors — existence
// itself is concealed, not just content. Deliberate reuse of Job's
// precedent since FundingRound has the same "public when open" shape Job's
// "public when published" shape has; every other Funding/Investor endpoint
// keeps this repo's usual 403-on-no-access convention.
async function getRoundForViewer(id, userId) {
  try {
    const round = await getRoundById(id);
    const isPubliclyVisible = round.status === "open" && !round.isArchived;
    if (isPubliclyVisible) {
      return round;
    }

    if (!userId) {
      throw new ApiError(404, "Funding round not found.");
    }

    const access = await resolveStartupAccess(round.startup, userId);
    if (!access.role) {
      throw new ApiError(404, "Funding round not found.");
    }

    return round;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch funding round.");
  }
}

// "Downgrade to public subset" on an unauthorized/absent filter, same
// pattern jobService.listJobsForUser uses — never an outright rejection.
async function listRoundsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);
    const accessibleStartupIds = userId ? await getAccessibleStartupIds(userId) : [];

    if (base.startup) {
      const hasRole = accessibleStartupIds.some((id) => String(id) === String(base.startup));
      if (!hasRole) {
        base.status = "open";
        base.isArchived = false;
      }
    } else if (accessibleStartupIds.length > 0) {
      base.$or = [
        { status: "open", isArchived: false },
        { startup: { $in: accessibleStartupIds } },
      ];
    } else {
      base.status = "open";
      base.isArchived = false;
    }

    const query = FundingRound.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list funding rounds.");
  }
}

async function updateRound(id, userId, updateData) {
  try {
    const existing = await getRoundById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to update this funding round.");
    }
    if (existing.status !== "draft") {
      throw new ApiError(409, "Only draft funding rounds can be edited.");
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.startup;
    delete safeUpdate.createdBy;
    delete safeUpdate.raisedAmount;
    delete safeUpdate.status;
    delete safeUpdate.openedAt;
    delete safeUpdate.closedAt;
    delete safeUpdate.isArchived;
    safeUpdate.updatedBy = userId;

    const round = await FundingRound.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!round) {
      throw new ApiError(404, "Funding round not found.");
    }
    return round;
  } catch (error) {
    throw handleServiceError(error, "Failed to update funding round.");
  }
}

async function openRound(id, userId) {
  try {
    const existing = await getRoundById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to open this funding round.");
    }
    assertValidRoundTransition(existing.status, "open");

    const startup = await Startup.findById(existing.startup).lean();
    if (!startup || startup.status !== "active") {
      throw new ApiError(409, "This startup is not currently active.");
    }

    const round = await FundingRound.findByIdAndUpdate(
      id,
      { status: "open", openedAt: new Date(), updatedBy: userId },
      { new: true }
    ).lean();

    if (!round) {
      throw new ApiError(404, "Funding round not found.");
    }
    return round;
  } catch (error) {
    throw handleServiceError(error, "Failed to open funding round.");
  }
}

async function closeRound(id, userId) {
  try {
    const existing = await getRoundById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to close this funding round.");
    }
    assertValidRoundTransition(existing.status, "closed");

    const round = await FundingRound.findByIdAndUpdate(
      id,
      { status: "closed", closedAt: new Date(), updatedBy: userId },
      { new: true }
    ).lean();

    if (!round) {
      throw new ApiError(404, "Funding round not found.");
    }
    return round;
  } catch (error) {
    throw handleServiceError(error, "Failed to close funding round.");
  }
}

async function cancelRound(id, userId) {
  try {
    const existing = await getRoundById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to cancel this funding round.");
    }
    assertValidRoundTransition(existing.status, "cancelled");

    const round = await FundingRound.findByIdAndUpdate(
      id,
      { status: "cancelled", closedAt: new Date(), updatedBy: userId },
      { new: true }
    ).lean();

    if (!round) {
      throw new ApiError(404, "Funding round not found.");
    }
    return round;
  } catch (error) {
    throw handleServiceError(error, "Failed to cancel funding round.");
  }
}

module.exports = {
  resolveStartupAccess,
  getAccessibleStartupIds,
  assertValidRoundTransition,
  createRound,
  getRoundById,
  getRoundForViewer,
  listRoundsForUser,
  updateRound,
  openRound,
  closeRound,
  cancelRound,
};
