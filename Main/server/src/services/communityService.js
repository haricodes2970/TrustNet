const mongoose = require("mongoose");
const Community = require("../models/Community");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter, assertOwner } = require("./serviceUtils");

// Error typing: 404 not found (incl. hidden/deleted view-concealment), 403
// ownership/authorization failure, 409 state conflict (duplicate name,
// deleted community, private-community self-join, duplicate/absent
// membership). Malformed input is rejected by validators (400) before
// reaching this file.

// Global, case-insensitive - a Community's name acts as a single shared
// public namespace (unlike Startup's per-founder scoping), so uniqueness
// is checked platform-wide among non-deleted communities.
async function assertNoDuplicateName(name, excludeId) {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = { deletedAt: null, name: new RegExp(`^${escaped}$`, "i") };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Community.findOne(query).lean();
  if (existing) {
    throw new ApiError(409, "A community with this name already exists.");
  }
}

// The owner is a member of their own community from the start (memberCount
// previously started at 0 with an empty members[] even though the owner
// already exists and can post/moderate - a real bug, not by design).
async function createCommunity(data) {
  try {
    await assertNoDuplicateName(data.name);
    const community = await Community.create({
      ...data,
      members: [data.owner],
      memberCount: 1,
    });
    return community.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "This slug is already taken. Choose a different one.");
    }
    throw handleServiceError(error, "Failed to create community.");
  }
}

async function getCommunityById(id) {
  try {
    const community = await Community.findById(id).lean();
    if (!community) {
      throw new ApiError(404, "Community not found.");
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
      throw new ApiError(404, "Community not found.");
    }
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch community by slug.");
  }
}

// Same concealment convention every hardened module uses: a community an
// admin has hidden, or that's been (soft-)deleted, returns 404 to anyone
// but the owner or a platform admin - previously GET /:id and GET
// /slug/:slug returned hidden/deleted communities to literally anyone.
function assertCommunityViewAccess(community, viewer = {}) {
  const isOwner = viewer.id && String(community.owner) === String(viewer.id);
  const isAdmin = viewer.role === "admin";
  if (isOwner || isAdmin) {
    return;
  }
  if (community.isHidden || community.deletedAt) {
    throw new ApiError(404, "Community not found.");
  }
}

async function getCommunityForViewer(id, viewer = {}) {
  try {
    const community = await getCommunityById(id);
    assertCommunityViewAccess(community, viewer);
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch community.");
  }
}

async function getCommunityBySlugForViewer(slug, viewer = {}) {
  try {
    const community = await getCommunityBySlug(slug);
    assertCommunityViewAccess(community, viewer);
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch community by slug.");
  }
}

async function updateCommunity(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getCommunityById(id);
    if (!isAdmin) {
      assertOwner(existing.owner, userId, "You are not authorized to update this community.", 403);
    }
    if (existing.deletedAt) {
      throw new ApiError(409, "This community has been deleted. Restore it before making changes.");
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.owner;
    delete safeUpdate.members;
    delete safeUpdate.memberCount;
    delete safeUpdate.isHidden;
    delete safeUpdate.deletedAt;

    if (safeUpdate.name && safeUpdate.name.trim().toLowerCase() !== existing.name.trim().toLowerCase()) {
      await assertNoDuplicateName(safeUpdate.name, id);
    }

    const community = await Community.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!community) {
      throw new ApiError(404, "Community not found.");
    }
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to update community.");
  }
}

// Was a hard delete (findByIdAndDelete) despite deletedAt already existing
// on the schema - orphaned every Post referencing the community with no way
// back. Soft delete now, symmetric with the admin-moderation "delete"
// action (adminModerationService), which was already soft.
async function deleteCommunity(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getCommunityById(id);
    if (!isAdmin) {
      assertOwner(existing.owner, userId, "You are not authorized to delete this community.", 403);
    }

    const community = await Community.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).lean();
    if (!community) {
      throw new ApiError(404, "Community not found.");
    }
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete community.");
  }
}

async function restoreCommunity(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getCommunityById(id);
    if (!isAdmin) {
      assertOwner(existing.owner, userId, "You are not authorized to restore this community.", 403);
    }

    const community = await Community.findByIdAndUpdate(id, { deletedAt: null }, { new: true }).lean();
    if (!community) {
      throw new ApiError(404, "Community not found.");
    }
    return community;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore community.");
  }
}

// isHidden/deletedAt default to excluded so an admin moderation action
// actually removes content from view; an explicit filter value overrides
// the default (same pattern every list endpoint in this codebase uses).
async function listCommunities(filter = {}, options = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const withDefaults = { isHidden: false, deletedAt: null, ...rest };
    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      withDefaults.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }
    const query = Community.find(withDefaults);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list communities.");
  }
}

// Self-service join only works for `type: "public"` - no invite/request
// system exists in this codebase for Community (unlike Team), so a
// private/restricted community can only gain members added out-of-band by
// its owner directly editing membership (not exposed as an endpoint this
// phase - out of scope, would need a real invite flow). Atomic, drift-free:
// memberCount is always derived from the post-update array size in the same
// operation, never a separately-tracked, driftable counter.
async function joinCommunity(id, userId) {
  try {
    const community = await getCommunityById(id);
    if (community.deletedAt) {
      throw new ApiError(409, "This community has been deleted and is not accepting new members.");
    }
    if (community.type !== "public") {
      throw new ApiError(403, "This community is private. Contact the owner to be added.");
    }
    const isMember = community.members.some((m) => String(m) === String(userId));
    if (isMember) {
      throw new ApiError(409, "You are already a member of this community.");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const updated = await Community.findByIdAndUpdate(
      id,
      [
        { $set: { members: { $setUnion: ["$members", [userObjectId]] } } },
        { $set: { memberCount: { $size: "$members" } } },
      ],
      { new: true }
    ).lean();
    return updated;
  } catch (error) {
    throw handleServiceError(error, "Failed to join community.");
  }
}

async function leaveCommunity(id, userId) {
  try {
    const community = await getCommunityById(id);
    if (String(community.owner) === String(userId)) {
      throw new ApiError(403, "The owner cannot leave their own community. Delete the community instead.");
    }
    const isMember = community.members.some((m) => String(m) === String(userId));
    if (!isMember) {
      throw new ApiError(409, "You are not a member of this community.");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const updated = await Community.findByIdAndUpdate(
      id,
      [
        {
          $set: {
            members: { $filter: { input: "$members", as: "m", cond: { $ne: ["$$m", userObjectId] } } },
          },
        },
        { $set: { memberCount: { $size: "$members" } } },
      ],
      { new: true }
    ).lean();
    return updated;
  } catch (error) {
    throw handleServiceError(error, "Failed to leave community.");
  }
}

// Reused by postService for "community"-visibility post gating - the
// canonical owner of Community membership logic, so importing it there is
// reuse, not duplication.
async function isMemberOfCommunity(communityId, userId) {
  if (!userId) {
    return false;
  }
  const community = await Community.findById(communityId).select("owner members").lean();
  if (!community) {
    return false;
  }
  return (
    String(community.owner) === String(userId) ||
    community.members.some((m) => String(m) === String(userId))
  );
}

async function listMemberCommunityIds(userId) {
  if (!userId) {
    return [];
  }
  const communities = await Community.find({
    deletedAt: null,
    $or: [{ owner: userId }, { members: userId }],
  })
    .select("_id")
    .lean();
  return communities.map((c) => c._id);
}

module.exports = {
  assertNoDuplicateName,
  createCommunity,
  getCommunityById,
  getCommunityBySlug,
  getCommunityForViewer,
  getCommunityBySlugForViewer,
  updateCommunity,
  deleteCommunity,
  restoreCommunity,
  listCommunities,
  joinCommunity,
  leaveCommunity,
  isMemberOfCommunity,
  listMemberCommunityIds,
};
