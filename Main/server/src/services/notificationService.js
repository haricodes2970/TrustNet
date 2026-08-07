const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Error typing: 404 not found (also covers "found but not yours" - the
// {_id, recipient} scoped query below never leaks that distinction, same
// concealment-by-construction every ownership-scoped query in this
// codebase relies on). Malformed input is rejected by the validator (400)
// before reaching this file.

async function createNotification(data) {
  try {
    return await Notification.create({
      recipient: data.recipient,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
    });
  } catch (error) {
    throw handleServiceError(error, "Failed to create notification.");
  }
}

// `read`/`type` filtering (previously unsupported - every list call
// returned the caller's entire notification history with no way to narrow
// it) plus flat search on title/message. `recipient` is forced after the
// spread so no filter can widen it to another user's notifications.
async function listNotifications(recipientId, filter = {}, options = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { ...rest, recipient: recipientId };
    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      base.$or = [{ title: regex }, { message: regex }];
    }

    const query = Notification.find(base).sort({ createdAt: -1 });
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list notifications.");
  }
}

async function getUnreadCount(recipientId) {
  try {
    const count = await Notification.countDocuments({ recipient: recipientId, read: false });
    return { unreadCount: count };
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch unread count.");
  }
}

async function markRead(id, recipientId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: recipientId },
      { read: true },
      { new: true }
    );
    if (!notification) {
      throw new ApiError(404, "Notification not found.");
    }
    return notification;
  } catch (error) {
    throw handleServiceError(error, "Failed to mark notification as read.");
  }
}

async function markAllRead(recipientId) {
  try {
    const result = await Notification.updateMany(
      { recipient: recipientId, read: false },
      { read: true }
    );
    return { modifiedCount: result.modifiedCount, updated: true };
  } catch (error) {
    throw handleServiceError(error, "Failed to mark all notifications as read.");
  }
}

async function deleteNotification(id, recipientId) {
  try {
    const notification = await Notification.findOneAndDelete({ _id: id, recipient: recipientId });
    if (!notification) {
      throw new ApiError(404, "Notification not found.");
    }
    return { id: notification._id, deleted: true };
  } catch (error) {
    throw handleServiceError(error, "Failed to delete notification.");
  }
}

module.exports = {
  createNotification,
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
