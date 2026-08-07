const Post = require("../models/Post");
const ApiError = require("../utils/ApiError");
const communityService = require("./communityService");
const { applyQueryOptions, handleServiceError, normalizeFilter, assertOwner } = require("./serviceUtils");

// Error typing: 404 not found (incl. view-concealment for private/community/
// hidden/deleted posts), 403 ownership failure, 409 state conflict (deleted
// post/community). Malformed input is rejected by the validator (400)
// before reaching this file.

async function createPost(data, userId) {
  try {
    if (data.community) {
      const community = await communityService.getCommunityById(data.community);
      if (community.deletedAt) {
        throw new ApiError(409, "This community has been deleted and cannot accept new posts.");
      }
    }

    const post = await Post.create({ ...data, author: userId });
    return post.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create post.");
  }
}

async function getPostById(id) {
  try {
    const post = await Post.findById(id).lean();
    if (!post) {
      throw new ApiError(404, "Post not found.");
    }
    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch post.");
  }
}

// Same 404-concealment convention every hardened module uses: existence is
// concealed, not just content. Previously there was NO visibility
// enforcement at all - private and community-only posts were readable by
// anyone, including anonymous visitors.
async function assertPostViewAccess(post, viewer = {}) {
  const isAuthor = viewer.id && String(post.author) === String(viewer.id);
  const isAdmin = viewer.role === "admin";
  if (isAuthor || isAdmin) {
    return;
  }

  if (post.isHidden || post.deletedAt) {
    throw new ApiError(404, "Post not found.");
  }
  if (post.visibility === "private") {
    throw new ApiError(404, "Post not found.");
  }
  if (post.visibility === "community") {
    const isMember = post.community && (await communityService.isMemberOfCommunity(post.community, viewer.id));
    if (!isMember) {
      throw new ApiError(404, "Post not found.");
    }
  }
}

async function getPostForViewer(id, viewer = {}) {
  try {
    const post = await getPostById(id);
    await assertPostViewAccess(post, viewer);
    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch post.");
  }
}

async function updatePost(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getPostById(id);
    if (!isAdmin) {
      assertOwner(existing.author, userId, "You are not authorized to update this post.", 403);
    }
    if (existing.deletedAt) {
      throw new ApiError(409, "This post has been deleted. Restore it before making changes.");
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.author;
    delete safeUpdate.isHidden;
    delete safeUpdate.deletedAt;
    delete safeUpdate.likes;
    delete safeUpdate.likeCount;
    delete safeUpdate.commentCount;

    const post = await Post.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!post) {
      throw new ApiError(404, "Post not found.");
    }
    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to update post.");
  }
}

// Was a hard delete (findByIdAndDelete) despite deletedAt already existing
// on the schema - orphaned every Comment referencing the post with no way
// back. Soft delete now, symmetric with the admin-moderation "delete"
// action, which was already soft.
async function deletePost(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getPostById(id);
    if (!isAdmin) {
      assertOwner(existing.author, userId, "You are not authorized to delete this post.", 403);
    }

    const post = await Post.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).lean();
    if (!post) {
      throw new ApiError(404, "Post not found.");
    }
    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete post.");
  }
}

async function restorePost(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getPostById(id);
    if (!isAdmin) {
      assertOwner(existing.author, userId, "You are not authorized to restore this post.", 403);
    }
    if (existing.community) {
      const community = await communityService.getCommunityById(existing.community);
      if (community.deletedAt) {
        throw new ApiError(409, "The parent community has been deleted. Restore it first.");
      }
    }

    const post = await Post.findByIdAndUpdate(id, { deletedAt: null }, { new: true }).lean();
    if (!post) {
      throw new ApiError(404, "Post not found.");
    }
    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore post.");
  }
}

// "Scope, don't reject" - same convention every list-scoped module in this
// codebase uses. Public posts are always visible; private posts only to
// their author; community posts only to a member of that community (or its
// author). Platform admin sees everything, ignoring both the isHidden/
// deletedAt default exclusion and the visibility scoping.
async function listPostsForUser(viewer = {}, filter = {}, options = {}, { isAdmin = false } = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { ...rest };

    if (!isAdmin) {
      if (base.isHidden === undefined) base.isHidden = false;
      if (base.deletedAt === undefined) base.deletedAt = null;
    }

    const andClauses = [];

    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      andClauses.push({ $or: [{ title: regex }, { content: regex }, { tags: regex }] });
    }

    if (!isAdmin) {
      const memberCommunityIds = viewer.id ? await communityService.listMemberCommunityIds(viewer.id) : [];
      const visibilityOr = [{ visibility: "public" }];
      if (viewer.id) {
        visibilityOr.push({ author: viewer.id });
        visibilityOr.push({ visibility: "community", community: { $in: memberCommunityIds } });
      }
      andClauses.push({ $or: visibilityOr });
    }

    if (andClauses.length > 0) {
      base.$and = [...(base.$and || []), ...andClauses];
    }

    const query = Post.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list posts.");
  }
}

module.exports = {
  createPost,
  getPostById,
  getPostForViewer,
  assertPostViewAccess,
  updatePost,
  deletePost,
  restorePost,
  listPostsForUser,
};
