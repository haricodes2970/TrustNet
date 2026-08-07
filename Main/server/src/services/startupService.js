const Startup = require("../models/Startup");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

async function createStartup(data) {
  try {
    return await Startup.create(data);
  } catch (error) {
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
