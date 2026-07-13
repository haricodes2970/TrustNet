const messageService = require("../services/messageService");
const userService = require("../services/userService");

async function resolveCurrentUserId(req) {
  const user = await userService.getUserByEmail(req.user.email);
  return user._id;
}

async function createConversation(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const conversation = await messageService.createConversation({
      ...req.body,
      createdBy: currentUserId,
    });
    return res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getConversation(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const conversation = await messageService.getConversationById(req.params.id, currentUserId);
    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function listConversations(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const conversations = await messageService.listConversations(
      currentUserId,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteConversation(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const result = await messageService.deleteConversation(req.params.id, currentUserId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function sendMessage(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const message = await messageService.sendMessage({
      conversationId: req.params.id,
      senderId: currentUserId,
      content: req.body.content,
      attachments: req.body.attachments,
      replyTo: req.body.replyTo,
    });
    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function listMessages(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const messages = await messageService.listMessages(
      req.params.id,
      currentUserId,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function markMessageRead(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const message = await messageService.markMessageRead(
      req.params.id,
      req.params.messageId,
      currentUserId
    );
    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function deleteMessage(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const result = await messageService.deleteMessage(
      req.params.id,
      req.params.messageId,
      currentUserId
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function getUnreadCount(req, res) {
  try {
    const currentUserId = await resolveCurrentUserId(req);
    const result = await messageService.getUnreadCount(currentUserId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createConversation,
  getConversation,
  listConversations,
  deleteConversation,
  sendMessage,
  listMessages,
  markMessageRead,
  deleteMessage,
  getUnreadCount,
};
