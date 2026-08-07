const Startup = require("../models/Startup");
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
async function deleteStartup(id) {
  try {
    const startup = await Startup.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
    if (!startup) {
      throw new Error("Startup not found.");
    }
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

// isSuspended/deletedAt default to excluded, same pattern as Post/
// Community's listing defaults - an explicit filter value (e.g. admin's
// suspended/deleted view) overrides it.
async function listStartups(filter = {}, options = {}) {
  try {
    const withDefaults = { isSuspended: false, deletedAt: null, ...normalizeFilter(filter) };
    const query = Startup.find(withDefaults);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list startups.");
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
  updateStartup,
  deleteStartup,
  restoreStartup,
  listStartups,
  listMyStartups,
};
