const Community = require("../models/Community");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

async function createCommunity(data) {
  try {
    return await Community.create(data);
  } catch (error) {
    throw handleServiceError(error, "Failed to create community.");
  }
}

async function getCommunityById(id) {
  try {
    const community = await Community.findById(id).lean();
    if (!community) {
      throw new Error("Community not found.");
    }
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch community.");
  }
}

async function getCommunityBySlug(slug) {
  try {
    const community = await Community.findOne({ slug }).lean();
    if (!community) {
      throw new Error("Community not found.");
    }
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch community by slug.");
  }
}

async function updateCommunity(id, updateData) {
  try {
    const community = await Community.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!community) {
      throw new Error("Community not found.");
    }

    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to update community.");
  }
}

async function deleteCommunity(id) {
  try {
    const community = await Community.findByIdAndDelete(id);
    if (!community) {
      throw new Error("Community not found.");
    }
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete community.");
  }
}

async function listCommunities(filter = {}, options = {}) {
  try {
    const withDefaults = { isHidden: false, deletedAt: null, ...normalizeFilter(filter) };
    const query = Community.find(withDefaults);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list communities.");
  }
}

async function joinCommunity(id, userId) {
  try {
    const community = await Community.findByIdAndUpdate(
      id,
      { $addToSet: { members: userId }, $inc: { memberCount: 1 } },
      { new: true }
    ).lean();

    if (!community) {
      throw new Error("Community not found.");
    }

    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to join community.");
  }
}

async function leaveCommunity(id, userId) {
  try {
    const community = await Community.findByIdAndUpdate(
      id,
      { $pull: { members: userId }, $inc: { memberCount: -1 } },
      { new: true }
    ).lean();

    if (!community) {
      throw new Error("Community not found.");
    }

    if (community.memberCount < 0) {
      await Community.findByIdAndUpdate(id, { memberCount: 0 });
      community.memberCount = 0;
    }

    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to leave community.");
  }
}

module.exports = {
  createCommunity,
  getCommunityById,
  getCommunityBySlug,
  updateCommunity,
  deleteCommunity,
  listCommunities,
  joinCommunity,
  leaveCommunity,
};
