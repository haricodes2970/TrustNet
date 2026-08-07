const postService = require("../services/postService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) - the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

function isPlatformAdmin(req) {
  return Boolean(req.user) && req.user.role === "admin";
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Post", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createPost(req, res) {
  try {
    const post = await postService.createPost(
      {
        title: req.body.title,
        content: req.body.content,
        community: req.body.community || null,
        startup: req.body.startup || null,
        postType: req.body.postType,
        images: req.body.images,
        videoUrl: req.body.videoUrl,
        tags: req.body.tags,
        visibility: req.body.visibility,
      },
      req.user.id
    );
    logAction(req, "post.create", post._id, {});
    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getPost(req, res) {
  try {
    const viewer = req.user ? { id: req.user.id, role: req.user.role } : {};
    const post = await postService.getPostForViewer(req.params.id, viewer);
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updatePost(req, res) {
  try {
    const post = await postService.updatePost(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "post.update", post._id, {});
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deletePost(req, res) {
  try {
    const post = await postService.deletePost(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "post.delete", post._id, {});
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restorePost(req, res) {
  try {
    const post = await postService.restorePost(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "post.restore", post._id, {});
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listPosts(req, res) {
  try {
    const viewer = req.user ? { id: req.user.id, role: req.user.role } : {};
    const filter = { ...(req.query.filter || {}) };
    if (req.query.community) filter.community = req.query.community;
    if (req.query.author) filter.author = req.query.author;
    if (req.query.search) filter.search = req.query.search;

    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const posts = await postService.listPostsForUser(viewer, filter, options, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: posts });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createPost,
  getPost,
  updatePost,
  deletePost,
  restorePost,
  listPosts,
};
