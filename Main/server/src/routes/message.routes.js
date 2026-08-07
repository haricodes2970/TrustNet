const express = require("express");
const messageController = require("../controllers/messageController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { createConversation, sendMessage, editMessage } = require("../validators/message.validators");

const router = express.Router();

router.use(authenticate);
// No role list - just populates req.user.role for the platform-admin
// override (view/moderate any conversation or message).
router.use(authorize());

/**
 * @openapi
 * /messages/conversations:
 *   get:
 *     summary: List the current user's conversations (search via ?search=, pagination via ?limit=&skip=)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of conversations }
 */
router.get("/conversations", messageController.listConversations);

/**
 * @openapi
 * /messages/conversations:
 *   post:
 *     summary: Create or open a conversation (rejects deleted/suspended participants)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Conversation created }
 *       409: { description: A participant is not currently active }
 */
router.post(
  "/conversations",
  validate(createConversation),
  messageController.createConversation
);

/**
 * @openapi
 * /messages/conversations/{id}:
 *   get:
 *     summary: Get a single conversation (participant or platform admin)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation details }
 */
router.get("/conversations/:id", messageController.getConversation);

/**
 * @openapi
 * /messages/conversations/{id}:
 *   delete:
 *     summary: Delete a conversation (soft, restorable; participant or platform admin)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation deleted }
 */
router.delete("/conversations/:id", messageController.deleteConversation);

/**
 * @openapi
 * /messages/conversations/{id}/restore:
 *   post:
 *     summary: Restore a deleted conversation (participant or platform admin)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation restored }
 *       409: { description: Not deleted }
 */
router.post("/conversations/:id/restore", messageController.restoreConversation);

/**
 * @openapi
 * /messages/conversations/{id}/messages:
 *   get:
 *     summary: List messages in a conversation (search via ?search=, pagination via ?limit=&skip=)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: List of messages }
 */
router.get("/conversations/:id/messages", messageController.listMessages);

/**
 * @openapi
 * /messages/conversations/{id}/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Message sent }
 *       409: { description: Conversation has been deleted }
 */
router.post(
  "/conversations/:id/messages",
  validate(sendMessage),
  messageController.sendMessage
);

/**
 * @openapi
 * /messages/conversations/{id}/messages/{messageId}/read:
 *   put:
 *     summary: Mark a message as read (participant only)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: messageId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Message marked read }
 */
router.put(
  "/conversations/:id/messages/:messageId/read",
  messageController.markMessageRead
);

/**
 * @openapi
 * /messages/conversations/{id}/messages/{messageId}:
 *   put:
 *     summary: Edit your own message
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: messageId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Message edited }
 */
router.put(
  "/conversations/:id/messages/:messageId",
  validate(editMessage),
  messageController.editMessage
);

/**
 * @openapi
 * /messages/conversations/{id}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (soft, restorable; sender or platform admin)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: messageId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Message deleted }
 */
router.delete(
  "/conversations/:id/messages/:messageId",
  messageController.deleteMessage
);

/**
 * @openapi
 * /messages/conversations/{id}/messages/{messageId}/restore:
 *   post:
 *     summary: Restore a deleted message (sender or platform admin; blocked while the parent conversation is deleted)
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: messageId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Message restored }
 */
router.post(
  "/conversations/:id/messages/:messageId/restore",
  messageController.restoreMessage
);

/**
 * @openapi
 * /messages/unread-count:
 *   get:
 *     summary: Get the current user's unread message count
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get("/unread-count", messageController.getUnreadCount);

module.exports = router;
