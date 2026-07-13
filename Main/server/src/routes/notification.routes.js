const express = require("express");
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List the current user's notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of notifications }
 */
router.get("/", notificationController.listNotifications);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get the current user's unread notification count
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get("/unread-count", notificationController.getUnreadCount);

/**
 * @openapi
 * /notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Notification marked read }
 */
router.put("/:id/read", notificationController.markRead);

/**
 * @openapi
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: All notifications marked read }
 */
router.put("/read-all", notificationController.markAllRead);

/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Notification deleted }
 */
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
