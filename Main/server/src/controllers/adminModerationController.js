const adminModerationService = require("../services/adminModerationService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

const TARGET_TYPE_BY_CONTENT_TYPE = {
  posts: "Post",
  comments: "Comment",
  communities: "Community",
  listings: "ServiceListing",
  jobs: "Job",
};

function logAdminAction(req, action, targetType, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType, targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function moderate(req, res) {
  try {
    const { type, id } = req.params;
    const { action, reason } = req.body;

    const content = await adminModerationService.moderate(type, id, action);

    logAdminAction(req, `content.${action}`, TARGET_TYPE_BY_CONTENT_TYPE[type] || type, id, {
      contentType: type,
      reason: reason || null,
    });

    return res.status(200).json({ success: true, data: content });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : /not found/i.test(error.message) ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = { moderate };
