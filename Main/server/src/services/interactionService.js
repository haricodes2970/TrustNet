const Post = require("../models/Post");
const Comment = require("../models/Comment");
const userService = require("./userService");
const { handleServiceError } = require("./serviceUtils");

// The mock auth layer carries the user identity as an email and may not yet
// have a persisted MongoDB user. Resolve it to a profile document, creating
// one on first use, mirroring the profile module's behaviour.
async function resolveUser(email) {
  try {
    return await userService.getUserByEmail(email);
  } catch (err) {
    const local = String(email).split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_") || "user";
    return userService.createUser({
      email,
      username: `${local}_${Math.random().toString(36).slice(2, 8)}`,
      fullName: local,
    });
  }
}

async function likePost(postId, email) {
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const user = await resolveUser(email);
    const alreadyLiked = post.likes.some((id) => id.equals(user._id));

    if (!alreadyLiked) {
      post.likes.push(user._id);
      post.likeCount = post.likes.length;
      await post.save();
    }

    return { liked: true, likeCount: post.likeCount };
  } catch (error) {
    throw handleServiceError(error, "Failed to like post.");
  }
}

async function unlikePost(postId, email) {
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const user = await resolveUser(email);
    const alreadyLiked = post.likes.some((id) => id.equals(user._id));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(user._id));
      post.likeCount = post.likes.length;
      await post.save();
    }

    return { liked: false, likeCount: post.likeCount };
  } catch (error) {
    throw handleServiceError(error, "Failed to unlike post.");
  }
}

async function listComments(postId, options = {}) {
  try {
    const query = Comment.find({ post: postId }).populate(
      "author",
      "fullName username avatarUrl email"
    );

    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ createdAt: 1 });
    }

    if (options.limit) {
      query.limit(Number(options.limit));
    }

    if (options.skip) {
      query.skip(Number(options.skip));
    }

    return query.lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list comments.");
  }
}

async function addComment(postId, email, content) {
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    const user = await resolveUser(email);
    const comment = await Comment.create({
      post: postId,
      author: user._id,
      content,
    });

    post.commentCount = Math.max(0, (post.commentCount || 0) + 1);
    await post.save();

    return Comment.findById(comment._id)
      .populate("author", "fullName username avatarUrl email")
      .lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to add comment.");
  }
}

async function updateComment(commentId, email, content) {
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }

    const user = await resolveUser(email);
    if (String(comment.author) !== String(user._id)) {
      throw new Error("You can only edit your own comment.");
    }

    comment.content = content;
    await comment.save();

    return Comment.findById(comment._id)
      .populate("author", "fullName username avatarUrl email")
      .lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to update comment.");
  }
}

async function deleteComment(commentId, email) {
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }

    const user = await resolveUser(email);
    if (String(comment.author) !== String(user._id)) {
      throw new Error("You can only delete your own comment.");
    }

    const postId = comment.post;
    await comment.deleteOne();

    const post = await Post.findById(postId);
    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
      await post.save();
    }

    return { deleted: true };
  } catch (error) {
    throw handleServiceError(error, "Failed to delete comment.");
  }
}

module.exports = {
  likePost,
  unlikePost,
  listComments,
  addComment,
  updateComment,
  deleteComment,
};
