const Notification = require("../models/Notification");
const { applyQueryOptions, handleServiceError } = require("./serviceUtils");

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

async function listNotifications(recipientId, options = {}) {
  try {
    const query = Notification.find({ recipient: recipientId }).sort({ createdAt: -1 });
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
      throw new Error("Notification not found.");
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
      throw new Error("Notification not found.");
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
