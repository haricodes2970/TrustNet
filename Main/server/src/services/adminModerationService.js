const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Community = require("../models/Community");
const Job = require("../models/Job");
const ServiceListing = require("../models/ServiceListing");
const ApiError = require("../utils/ApiError");
const { handleServiceError } = require("./serviceUtils");

// No "approve" action: none of these five content types has a
// submission/pending-review queue today (posts, comments, communities,
// listings and jobs all publish immediately) - only "hide", "restore" and
// "delete" map to real state in this codebase. Adding a fake "approve"
// that behaves identically to "restore" would be a hollow no-op; a real
// approval queue needs its own model (tracked as a follow-up gap).
const ACTIONS = ["hide", "restore", "delete"];

function fieldsFor(action) {
  if (action === "hide") return { isHidden: true };
  if (action === "restore") return { isHidden: false, deletedAt: null };
  return { deletedAt: new Date() }; // delete
}

// postService.updatePost / communityService.updateCommunity now enforce
// ownership (added in the Communities/Posts hardening phase, matching
// jobService.updateJob / serviceListingService.updateListing's existing
// shape) - a platform admin isn't the post's author or the community's
// owner, so going through the guarded service function would incorrectly
// reject them. All five content types go straight to the model here.
const HANDLERS = {
  posts: async (id, fields) => {
    const post = await Post.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
    if (!post) throw new Error("Post not found.");
    return post;
  },
  // Keeping Post.commentCount accurate across moderation: hiding/deleting a
  // comment removes it from listComments' view exactly like a user's own
  // soft-delete does, but unlike the user-facing path this one bypassed
  // Post.commentCount entirely - the count drifted upward forever after
  // any moderation action. Only adjusts on an actual visibility transition
  // (idempotent re-hide/re-delete no longer double-decrements).
  comments: async (id, fields) => {
    const before = await Comment.findById(id).select("isHidden deletedAt post");
    if (!before) throw new Error("Comment not found.");
    const wasVisible = !before.isHidden && !before.deletedAt;

    const comment = await Comment.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
    const isVisibleNow = !comment.isHidden && !comment.deletedAt;

    if (wasVisible && !isVisibleNow) {
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });
    } else if (!wasVisible && isVisibleNow) {
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: 1 } });
    }

    return comment;
  },
  communities: async (id, fields) => {
    const community = await Community.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
    if (!community) throw new Error("Community not found.");
    return community;
  },
  listings: async (id, fields) => {
    const listing = await ServiceListing.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
    if (!listing) throw new Error("Service listing not found.");
    return listing;
  },
  jobs: async (id, fields) => {
    const job = await Job.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
    if (!job) throw new Error("Job not found.");
    return job;
  },
};

async function moderate(type, id, action) {
  try {
    const handler = HANDLERS[type];
    if (!handler) {
      throw new ApiError(400, `Unknown content type "${type}". Must be one of: ${Object.keys(HANDLERS).join(", ")}.`);
    }
    if (!ACTIONS.includes(action)) {
      throw new ApiError(400, `Action must be one of: ${ACTIONS.join(", ")}.`);
    }

    return await handler(id, fieldsFor(action));
  } catch (error) {
    throw handleServiceError(error, "Failed to moderate content.");
  }
}

module.exports = { ACTIONS, moderate };
