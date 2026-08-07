const interactionService = require("../services/interactionService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) - the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

function isPlatformAdmin(req) {
  return Boolean(req.user) && req.user.role === "admin";
}

function logAction(req, action, targetType, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType, targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function likePost(req, res) {
  try {
    const result = await interactionService.likePost(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "post.like", "Post", req.params.id, {});
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function unlikePost(req, res) {
  try {
    const result = await interactionService.unlikePost(req.params.id, req.user.id);
    logAction(req, "post.unlike", "Post", req.params.id, {});
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listComments(req, res) {
  try {
    const viewer = req.user ? { id: req.user.id, role: req.user.role } : {};
    const comments = await interactionService.listComments(req.params.id, viewer, req.query.options || {});
    return res.status(200).json({ success: true, data: comments });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function addComment(req, res) {
  try {
    const comment = await interactionService.addComment(req.params.id, req.user.id, req.body.content);
    logAction(req, "comment.create", "Comment", comment._id, { post: req.params.id });
    return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateComment(req, res) {
  try {
    const comment = await interactionService.updateComment(req.params.commentId, req.user.id, req.body.content);
    logAction(req, "comment.update", "Comment", comment._id, {});
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deleteComment(req, res) {
  try {
    const result = await interactionService.deleteComment(req.params.commentId, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "comment.delete", "Comment", req.params.commentId, {});
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreComment(req, res) {
  try {
    const comment = await interactionService.restoreComment(req.params.commentId, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "comment.restore", "Comment", comment._id, {});
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  likePost,
  unlikePost,
  listComments,
  addComment,
  updateComment,
  deleteComment,
  restoreComment,
};
