const Comment = require("../models/Comment");
const Job = require("../models/Job");
const ServiceListing = require("../models/ServiceListing");
const postService = require("./postService");
const communityService = require("./communityService");
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

// postService.updatePost / communityService.updateCommunity are raw
// findByIdAndUpdate with no ownership check baked in (ownership is
// enforced in their own controllers, not the service) - safe to reuse
// directly. jobService.updateJob / serviceListingService.updateListing
// DO enforce startup/provider ownership inside the service itself, which
// would incorrectly reject a platform admin who isn't a team member -
// those two go straight to the model instead of through the guarded
// service function.
const HANDLERS = {
  posts: (id, fields) => postService.updatePost(id, fields),
  comments: async (id, fields) => {
    const comment = await Comment.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
    if (!comment) throw new Error("Comment not found.");
    return comment;
  },
  communities: (id, fields) => communityService.updateCommunity(id, fields),
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
