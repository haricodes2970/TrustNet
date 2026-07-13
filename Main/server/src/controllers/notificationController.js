const notificationService = require("../services/notificationService");
const userService = require("../services/userService");

async function resolveCurrentUserId(req) {
  const user = await userService.getUserByEmail(req.user.email);
  return user._id;
}

async function listNotifications(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const notifications = await notificationService.listNotifications(
      currentUserId,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getUnreadCount(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const result = await notificationService.getUnreadCount(currentUserId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function markRead(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const notification = await notificationService.markRead(req.params.id, currentUserId);
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function markAllRead(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const result = await notificationService.markAllRead(currentUserId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteNotification(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const result = await notificationService.deleteNotification(req.params.id, currentUserId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
