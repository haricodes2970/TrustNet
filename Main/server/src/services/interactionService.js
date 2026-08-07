const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const ApiError = require("../utils/ApiError");
const postService = require("./postService");
const { handleServiceError, assertOwner } = require("./serviceUtils");

// Previously resolved the acting user via a legacy email-based resolveUser()
// that would silently CREATE a new User record on a lookup miss - a relic
// of a pre-JWT "mock auth" era (see the old comment this replaced).
// authenticate already guarantees req.user.id references a real, persisted
// User by the time any request reaches here (it does its own
// User.findById(payload.sub) and 401s otherwise), so every function below
// now takes userId directly, like every other service in this codebase.
//
// Error typing: 404 not found (incl. the post's own view-concealment), 403
// ownership failure, 409 state conflict (duplicate/absent like or
// membership, deleted/hidden parent post). Malformed input is rejected by
// the validator (400) before reaching this file.

function assertPostAcceptingInteraction(post) {
  if (!post || post.isHidden || post.deletedAt) {
    throw new ApiError(404, "Post not found.");
  }
}

// Atomic, drift-free: likeCount is always derived from the post-update
// array size in the same operation, never a separately-tracked counter -
// closes the read-modify-write race the previous implementation had
// (fetch whole document, mutate the likes array in memory, .save() the
// entire document back - two concurrent likes could lose an update).
async function likePost(postId, userId, { isAdmin = false } = {}) {
  try {
    const post = await postService.getPostById(postId);
    if (!isAdmin) {
      await postService.assertPostViewAccess(post, { id: userId });
    }
    assertPostAcceptingInteraction(post);

    const alreadyLiked = post.likes.some((id) => String(id) === String(userId));
    if (alreadyLiked) {
      throw new ApiError(409, "You have already liked this post.");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const updated = await Post.findByIdAndUpdate(
      postId,
      [
        { $set: { likes: { $setUnion: ["$likes", [userObjectId]] } } },
        { $set: { likeCount: { $size: "$likes" } } },
      ],
      { new: true, updatePipeline: true }
    ).lean();

    return { liked: true, likeCount: updated.likeCount };
  } catch (error) {
    throw handleServiceError(error, "Failed to like post.");
  }
}

async function unlikePost(postId, userId) {
  try {
    const post = await postService.getPostById(postId);
    const alreadyLiked = post.likes.some((id) => String(id) === String(userId));
    if (!alreadyLiked) {
      throw new ApiError(409, "You have not liked this post.");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const updated = await Post.findByIdAndUpdate(
      postId,
      [
        {
          $set: {
            likes: { $filter: { input: "$likes", as: "u", cond: { $ne: ["$$u", userObjectId] } } },
          },
        },
        { $set: { likeCount: { $size: "$likes" } } },
      ],
      { new: true, updatePipeline: true }
    ).lean();

    return { liked: false, likeCount: updated.likeCount };
  } catch (error) {
    throw handleServiceError(error, "Failed to unlike post.");
  }
}

async function listComments(postId, viewer = {}, options = {}) {
  try {
    const post = await postService.getPostById(postId);
    await postService.assertPostViewAccess(post, viewer);

    const query = Comment.find({ post: postId, isHidden: false, deletedAt: null }).populate(
      "author",
      "fullName username avatarUrl email"
    );

    query.sort(options.sort || { createdAt: 1 });
    if (options.limit) query.limit(Number(options.limit));
    if (options.skip) query.skip(Number(options.skip));

    return query.lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list comments.");
  }
}

async function addComment(postId, userId, content) {
  try {
    const post = await postService.getPostById(postId);
    await postService.assertPostViewAccess(post, { id: userId });
    assertPostAcceptingInteraction(post);

    const comment = await Comment.create({
      post: postId,
      author: userId,
      content,
    });

    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

    return Comment.findById(comment._id).populate("author", "fullName username avatarUrl email").lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to add comment.");
  }
}

async function getCommentById(id) {
  try {
    const comment = await Comment.findById(id).lean();
    if (!comment) {
      throw new ApiError(404, "Comment not found.");
    }
    return comment;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch comment.");
  }
}

async function updateComment(commentId, userId, content) {
  try {
    const existing = await getCommentById(commentId);
    assertOwner(existing.author, userId, "You can only edit your own comment.", 403);
    if (existing.deletedAt) {
      throw new ApiError(409, "This comment has been deleted. Restore it before making changes.");
    }

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { content },
      { new: true, runValidators: true }
    )
      .populate("author", "fullName username avatarUrl email")
      .lean();

    return comment;
  } catch (error) {
    throw handleServiceError(error, "Failed to update comment.");
  }
}

// Soft delete now, symmetric with the admin-moderation "delete" action
// (adminModerationService), which was already soft - previously
// comment.deleteOne() hard-deleted despite isHidden/deletedAt already
// existing on the schema. Platform admin may also remove a comment through
// this same endpoint (matches every other module's admin-override-on-
// removal shape); editing someone else's comment content stays owner-only,
// same split Application's updateResume/updateCoverLetter established.
async function deleteComment(commentId, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getCommentById(commentId);
    if (!isAdmin) {
      assertOwner(existing.author, userId, "You can only delete your own comment.", 403);
    }

    const comment = await Comment.findByIdAndUpdate(commentId, { deletedAt: new Date() }, { new: true }).lean();
    if (comment && !existing.isHidden && !existing.deletedAt) {
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });
    }

    return { deleted: true };
  } catch (error) {
    throw handleServiceError(error, "Failed to delete comment.");
  }
}

async function restoreComment(commentId, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getCommentById(commentId);
    if (!isAdmin) {
      assertOwner(existing.author, userId, "You can only restore your own comment.", 403);
    }
    if (!existing.deletedAt) {
      throw new ApiError(409, "This comment is not deleted.");
    }

    const post = await postService.getPostById(existing.post);
    if (post.deletedAt) {
      throw new ApiError(409, "The parent post has been deleted. Restore it first.");
    }

    const comment = await Comment.findByIdAndUpdate(commentId, { deletedAt: null }, { new: true })
      .populate("author", "fullName username avatarUrl email")
      .lean();

    // Only count it back in if it's actually visible again - a comment an
    // admin also hid stays excluded from commentCount until that's undone
    // separately (isHidden is untouched by this user-facing restore).
    if (!existing.isHidden) {
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: 1 } });
    }

    return comment;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore comment.");
  }
}

module.exports = {
  likePost,
  unlikePost,
  listComments,
  addComment,
  getCommentById,
  updateComment,
  deleteComment,
  restoreComment,
};
