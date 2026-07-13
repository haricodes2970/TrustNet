const express = require("express");
const messageController = require("../controllers/messageController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { createConversation, sendMessage } = require("../validators/message.validators");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /messages/conversations:
 *   get:
 *     summary: List the current user's conversations
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
 *     summary: Create or open a conversation
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Conversation created }
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
 *     summary: Get a single conversation
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
 *     summary: Delete a conversation and its messages
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
 * /messages/conversations/{id}/messages:
 *   get:
 *     summary: List messages in a conversation
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
 *     summary: Mark a message as read
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
 *   delete:
 *     summary: Delete a message you sent
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
