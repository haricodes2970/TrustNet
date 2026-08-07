const Post = require("../models/Post");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

async function createPost(data) {
  try {
    return await Post.create(data);
  } catch (error) {
    throw handleServiceError(error, "Failed to create post.");
  }
}

async function getPostById(id) {
  try {
    const post = await Post.findById(id).lean();
    if (!post) {
      throw new Error("Post not found.");
    }
    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch post.");
  }
}

async function updatePost(id, updateData) {
  try {
    const post = await Post.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!post) {
      throw new Error("Post not found.");
    }

    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to update post.");
  }
}

async function deletePost(id) {
  try {
    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      throw new Error("Post not found.");
    }
    return post;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete post.");
  }
}

// isHidden/deletedAt default to excluded so an admin moderation action
// actually removes content from view; an explicit filter value (e.g. the
// admin moderation queue passing { isHidden: true }) overrides the default.
async function listPosts(filter = {}, options = {}) {
  try {
    const withDefaults = { isHidden: false, deletedAt: null, ...normalizeFilter(filter) };
    const query = Post.find(withDefaults);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list posts.");
  }
}

module.exports = {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  listPosts,
};
