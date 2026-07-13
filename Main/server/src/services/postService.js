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

async function listPosts(filter = {}, options = {}) {
  try {
    const query = Post.find(normalizeFilter(filter));
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
