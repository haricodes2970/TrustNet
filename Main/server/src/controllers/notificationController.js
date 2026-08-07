const notificationService = require("../services/notificationService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) - the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.
//
// Previously resolved the acting user via userService.getUserByEmail(
// req.user.email) on every single request - a tracked BACKLOG "per-request
// user lookups" performance/correctness item. authenticate already
// guarantees req.user.id references a real, persisted User, so every
// handler below uses it directly, like every other controller in this
// codebase.

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Notification", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function listNotifications(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.read !== undefined) filter.read = req.query.read === "true";
    if (req.query.type) filter.type = req.query.type;
    if (req.query.search) filter.search = req.query.search;

    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const notifications = await notificationService.listNotifications(req.user.id, filter, options);
    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getUnreadCount(req, res) {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function markRead(req, res) {
  try {
    const notification = await notificationService.markRead(req.params.id, req.user.id);
    logAction(req, "notification.read", notification._id, {});
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function markAllRead(req, res) {
  try {
    const result = await notificationService.markAllRead(req.user.id);
    logAction(req, "notification.readAll", null, result);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deleteNotification(req, res) {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user.id);
    logAction(req, "notification.delete", req.params.id, {});
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
