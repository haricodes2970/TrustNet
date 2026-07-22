const FundingContribution = require("../models/FundingContribution");
const FundingRound = require("../models/FundingRound");
const Startup = require("../models/Startup");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const fundingRoundService = require("./fundingRoundService");
const { handleServiceError, normalizeFilter, applyQueryOptions, assertOwner } = require("./serviceUtils");

// FundingContribution belongs to FundingRound (FundingRound -> Funding-
// Contribution). Reuses fundingRoundService.getRoundById/resolveStartupAccess
// (read-only) rather than re-deriving Startup access a fifth time — same
// "reuse your immediate parent's service" pattern Application used against
// jobService.
//
// Error typing: 404 not found, 403 authorization failure (role/ownership,
// including the acting investor's own inactive-account check), 409 state
// conflict (round not open, currency mismatch, terminal-state block,
// invalid transition, lost confirm/withdraw race). Malformed input is
// rejected by validators (400) before reaching here.

const TERMINAL_CONTRIBUTION_STATUSES = ["confirmed", "rejected", "withdrawn"];

// Pure, database-independent. Kept separate from
// fundingRoundService.assertValidRoundTransition and every other module's
// transition helper, per the project's standing "structurally similar but
// deliberately not shared" convention.
function assertValidContributionTransition(currentStatus, nextStatus) {
  if (TERMINAL_CONTRIBUTION_STATUSES.includes(currentStatus)) {
    throw new ApiError(409, `Contribution is in a terminal state ("${currentStatus}") and cannot transition.`);
  }
  if (!TERMINAL_CONTRIBUTION_STATUSES.includes(nextStatus)) {
    throw new ApiError(409, `Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
  }
}

async function resolveContributionRole(contribution, userId) {
  if (String(contribution.investor) === String(userId)) {
    return "investor";
  }
  const round = await fundingRoundService.getRoundById(contribution.fundingRound);
  const access = await fundingRoundService.resolveStartupAccess(round.startup, userId);
  return access.role || null;
}

async function createContribution({ fundingRoundId, amount, currency, note }, userId) {
  try {
    const round = await fundingRoundService.getRoundById(fundingRoundId);
    if (round.status !== "open" || round.isArchived) {
      throw new ApiError(409, "This funding round is not currently accepting contributions.");
    }
    if (currency !== round.currency) {
      throw new ApiError(409, "Contribution currency must match the funding round's currency.");
    }

    const user = await User.findById(userId).lean();
    if (!user || !user.isActive) {
      throw new ApiError(403, "Your account is not active.");
    }

    const contribution = await FundingContribution.create({
      fundingRound: fundingRoundId,
      investor: userId,
      amount,
      currency,
      note,
      createdBy: userId,
    });

    return contribution.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to submit contribution.");
  }
}

async function getContributionById(id) {
  try {
    const contribution = await FundingContribution.findById(id).lean();
    if (!contribution) {
      throw new ApiError(404, "Contribution not found.");
    }
    return contribution;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch contribution.");
  }
}

async function getContributionForViewer(id, userId) {
  try {
    const contribution = await getContributionById(id);
    const role = await resolveContributionRole(contribution, userId);
    if (!role) {
      throw new ApiError(403, "You are not authorized to view this contribution.");
    }
    return contribution;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch contribution.");
  }
}

// No public tier at all — every result is scoped so the caller never sees
// anything beyond what's rightfully theirs. Startup owner/admin/contributor
// see the full roster only when they explicitly filter by a round they
// have a role on; every other case (including an investor, or staff with
// no filter) is scoped to "my own contributions only."
async function listContributionsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);

    if (base.fundingRound) {
      const round = await fundingRoundService.getRoundById(base.fundingRound);
      const access = await fundingRoundService.resolveStartupAccess(round.startup, userId);
      if (!access.role) {
        base.investor = userId;
      }
    } else {
      base.investor = userId;
    }

    const query = FundingContribution.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list contributions.");
  }
}

// Funding totals: on confirm, atomically increments FundingRound.raisedAmount
// and Startup.fundingRaised via $inc — never a read-modify-write. The
// contribution's own pledged -> confirmed transition is itself the
// concurrency guard: findOneAndUpdate's { status: "pledged" } filter
// ensures only one caller can ever win the race and trigger the increments,
// even under concurrent confirm calls for the same contribution.
async function confirmContribution(id, userId) {
  try {
    const existing = await getContributionById(id);
    const round = await FundingRound.findById(existing.fundingRound).lean();
    if (!round) {
      throw new ApiError(404, "Funding round not found.");
    }

    const access = await fundingRoundService.resolveStartupAccess(round.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to confirm this contribution.");
    }
    assertValidContributionTransition(existing.status, "confirmed");

    const contribution = await FundingContribution.findOneAndUpdate(
      { _id: id, status: "pledged" },
      { status: "confirmed", updatedBy: userId },
      { new: true, runValidators: true }
    ).lean();

    if (!contribution) {
      throw new ApiError(409, "Contribution is no longer pledged and cannot be confirmed.");
    }

    await FundingRound.updateOne(
      { _id: round._id },
      { $inc: { raisedAmount: existing.amount }, $set: { updatedBy: userId } }
    );
    await Startup.updateOne({ _id: round.startup }, { $inc: { fundingRaised: existing.amount } });

    return contribution;
  } catch (error) {
    throw handleServiceError(error, "Failed to confirm contribution.");
  }
}

async function rejectContribution(id, userId) {
  try {
    const existing = await getContributionById(id);
    const round = await fundingRoundService.getRoundById(existing.fundingRound);
    const access = await fundingRoundService.resolveStartupAccess(round.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to reject this contribution.");
    }
    assertValidContributionTransition(existing.status, "rejected");

    const contribution = await FundingContribution.findOneAndUpdate(
      { _id: id, status: "pledged" },
      { status: "rejected", updatedBy: userId },
      { new: true }
    ).lean();

    if (!contribution) {
      throw new ApiError(409, "Contribution is no longer pledged and cannot be rejected.");
    }
    return contribution;
  } catch (error) {
    throw handleServiceError(error, "Failed to reject contribution.");
  }
}

async function withdraw(id, userId) {
  try {
    const existing = await getContributionById(id);
    assertOwner(existing.investor, userId, "You are not authorized to withdraw this contribution.", 403);
    assertValidContributionTransition(existing.status, "withdrawn");

    const contribution = await FundingContribution.findOneAndUpdate(
      { _id: id, status: "pledged" },
      { status: "withdrawn", updatedBy: userId },
      { new: true }
    ).lean();

    if (!contribution) {
      throw new ApiError(409, "Contribution is no longer pledged and cannot be withdrawn.");
    }
    return contribution;
  } catch (error) {
    throw handleServiceError(error, "Failed to withdraw contribution.");
  }
}

module.exports = {
  assertValidContributionTransition,
  resolveContributionRole,
  createContribution,
  getContributionById,
  getContributionForViewer,
  listContributionsForUser,
  confirmContribution,
  rejectContribution,
  withdraw,
};
