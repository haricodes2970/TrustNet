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

async function deleteStartup(id) {
  try {
    const startup = await Startup.findByIdAndDelete(id);
    if (!startup) {
      throw new Error("Startup not found.");
    }
    return startup;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete startup.");
  }
}

// isSuspended defaults to excluded, same pattern as Post/Community's
// listing defaults - an explicit filter value (admin's suspended-startups
// view) overrides it.
async function listStartups(filter = {}, options = {}) {
  try {
    const withDefaults = { isSuspended: false, ...normalizeFilter(filter) };
    const query = Startup.find(withDefaults);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list startups.");
  }
}

async function listMyStartups(founderId, options = {}) {
  try {
    const query = Startup.find({ founder: founderId });
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
  listStartups,
  listMyStartups,
};
