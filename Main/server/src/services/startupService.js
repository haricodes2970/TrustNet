const Startup = require("../models/Startup");
const Workspace = require("../models/Workspace");
const Team = require("../models/Team");
const Job = require("../models/Job");
const FundingRound = require("../models/FundingRound");
const InvestmentInterest = require("../models/InvestmentInterest");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Case-insensitive, per-founder only - two different founders may legally
// run same-named startups (real-world name collisions happen), but one
// founder registering "Acme" twice is almost always a duplicate submission
// or an accidental double-click, not two distinct businesses.
async function assertNoDuplicateName(founderId, name) {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await Startup.findOne({
    founder: founderId,
    deletedAt: null,
    name: new RegExp(`^${escaped}$`, "i"),
  }).lean();

  if (existing) {
    throw new ApiError(409, "You already have a startup with this name.");
  }
}

async function createStartup(data) {
  try {
    await assertNoDuplicateName(data.founder, data.name);
    return await Startup.create(data);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      throw new ApiError(409, "This slug is already taken. Choose a different one.");
    }
    throw handleServiceError(error, "Failed to create startup.");
  }
}

async function getStartupById(id) {
  try {
    const startup = await Startup.findById(id).lean();
    if (!startup) {
      throw new Error("Startup not found.");
    }
    return startup;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch startup.");
  }
}

async function getStartupBySlug(slug) {
  try {
    const startup = await Startup.findOne({ slug }).lean();
    if (!startup) {
      throw new Error("Startup not found.");
    }
    return startup;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch startup by slug.");
  }
}

async function updateStartup(id, updateData) {
  try {
    const startup = await Startup.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!startup) {
      throw new Error("Startup not found.");
    }

    return startup;
  } catch (error) {
    throw handleServiceError(error, "Failed to update startup.");
  }
}

// Soft delete: Team, Workspace, Job and FundingRound all reference a
// startup by id (Team.startup, Workspace.startup, Job.startup,
// FundingRound.startup) - a hard delete orphaned every one of those on
// the next lookup. Flagging deletedAt keeps the row (and every reference
// to it) intact and reversible via restoreStartup.
//
// Cascades to Workspace/Team: without this, a deleted startup's workspace
// and teams stayed fully live - members could still invite/update/archive
// as if nothing happened. Archiving both (not soft-deleting them - they
// have their own, separate isArchived flag and restore path) means
// restoreStartup does NOT auto-restore them; the owner restores each
// deliberately via workspaceService.restoreWorkspace/teamService.restoreTeam,
// which already refuse to run while the startup is still deleted.
//
// Cascades to Job too (Hiring & Applications phase): found the same gap -
// a deleted startup's published jobs stayed fully live on the public job
// board and kept accepting applications. Uses Job.isArchived, NOT Job.
// deletedAt (a separate, admin-moderation-only field from the Admin
// Dashboard phase, cleared only via the admin content-moderation "restore"
// action) - isArchived is Job's owner-restorable field, symmetric with
// jobService.restoreJob, which already refuses to run while the startup is
// still deleted. Using deletedAt here instead would have cascaded the
// startup-delete correctly but left the founder with no self-service way
// to undo it after restoring their startup.
//
// Cascades to FundingRound and InvestmentInterest too (Investors & Funding
// phase): same gap, same fix - both use their own isArchived flag,
// symmetric with fundingRoundService.restoreRound/investmentInterestService.
// restoreInterest, which already refuse to run while the startup is still
// deleted. This also transitively blocks new FundingContributions (its own
// createContribution already rejects a round with isArchived:true).
async function deleteStartup(id) {
  try {
    const startup = await Startup.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
    if (!startup) {
      throw new Error("Startup not found.");
    }

    await Promise.all([
      Workspace.updateMany({ startup: id, isArchived: false }, { isArchived: true }),
      Team.updateMany({ startup: id, isArchived: false }, { isArchived: true }),
      Job.updateMany({ startup: id, isArchived: false }, { isArchived: true }),
      FundingRound.updateMany({ startup: id, isArchived: false }, { isArchived: true }),
      InvestmentInterest.updateMany({ startup: id, isArchived: false }, { isArchived: true }),
    ]);

    return startup;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete startup.");
  }
}

async function restoreStartup(id) {
  try {
    const startup = await Startup.findByIdAndUpdate(id, { deletedAt: null }, { new: true });
    if (!startup) {
      throw new Error("Startup not found.");
    }
    return startup;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore startup.");
  }
}

// isPublic/status/isSuspended/deletedAt default to the public-directory
// subset, same override-friendly pattern as Post/Community/Job's listing
// defaults - an explicit filter value overrides a default (admin's own
// GET /admin/startups, from the Admin Dashboard phase, already relies on
// this to see suspended startups by passing an explicit filter).
async function listStartups(filter = {}, options = {}) {
  try {
    const withDefaults = {
      isPublic: true,
      status: "active",
      isSuspended: false,
      deletedAt: null,
      ...normalizeFilter(filter),
    };
    const query = Startup.find(withDefaults);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list startups.");
  }
}

// Same 404-concealment convention as jobService.assertJobViewAccess /
// serviceListingService.getListingForViewer: a non-public startup returns
// "not found" to anyone who isn't its founder or a platform admin, rather
// than a 403 that would confirm the id/slug exists.
function isPubliclyVisible(startup) {
  return startup.isPublic === true && startup.status === "active" && !startup.isSuspended && !startup.deletedAt;
}

function assertStartupViewAccess(startup, viewer) {
  if (isPubliclyVisible(startup)) {
    return;
  }

  const isOwner = viewer && viewer.id && String(startup.founder) === String(viewer.id);
  const isAdmin = viewer && viewer.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new Error("Startup not found.");
  }
}

async function listMyStartups(founderId, options = {}) {
  try {
    const query = Startup.find({ founder: founderId, deletedAt: null });
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list your startups.");
  }
}

module.exports = {
  createStartup,
  getStartupById,
  getStartupBySlug,
  assertStartupViewAccess,
  updateStartup,
  deleteStartup,
  restoreStartup,
  listStartups,
  listMyStartups,
};
