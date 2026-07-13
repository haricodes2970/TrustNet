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

async function listStartups(filter = {}, options = {}) {
  try {
    const query = Startup.find(normalizeFilter(filter));
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list startups.");
  }
}

module.exports = {
  createStartup,
  getStartupById,
  getStartupBySlug,
  updateStartup,
  deleteStartup,
  listStartups,
};
