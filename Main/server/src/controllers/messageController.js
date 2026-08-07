const messageService = require("../services/messageService");
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

function parseListOptions(req) {
  const options = { ...(req.query.options || {}) };
  if (req.query.limit !== undefined) options.limit = req.query.limit;
  if (req.query.skip !== undefined) options.skip = req.query.skip;
  if (req.query.sort !== undefined) options.sort = req.query.sort;
  return options;
}

async function createConversation(req, res) {
  try {
    const conversation = await messageService.createConversation({
      ...req.body,
      createdBy: req.user.id,
    });
    logAction(req, "conversation.create", "Conversation", conversation._id, {});
    return res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getConversation(req, res) {
  try {
    const conversation = await messageService.getConversationById(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listConversations(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.search) filter.search = req.query.search;

    const conversations = await messageService.listConversations(req.user.id, filter, parseListOptions(req));
    return res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deleteConversation(req, res) {
  try {
    const conversation = await messageService.deleteConversation(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "conversation.delete", "Conversation", conversation._id, {});
    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreConversation(req, res) {
  try {
    const conversation = await messageService.restoreConversation(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "conversation.restore", "Conversation", conversation._id, {});
    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function sendMessage(req, res) {
  try {
    const message = await messageService.sendMessage({
      conversationId: req.params.id,
      senderId: req.user.id,
      content: req.body.content,
      attachments: req.body.attachments,
      replyTo: req.body.replyTo,
    });
    logAction(req, "message.send", "Message", message._id, { conversation: req.params.id });
    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listMessages(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.search) filter.search = req.query.search;

    const messages = await messageService.listMessages(
      req.params.id,
      req.user.id,
      filter,
      parseListOptions(req),
      { isAdmin: isPlatformAdmin(req) }
    );
    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function markMessageRead(req, res) {
  try {
    const message = await messageService.markMessageRead(req.params.id, req.params.messageId, req.user.id);
    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function editMessage(req, res) {
  try {
    const message = await messageService.editMessage(
      req.params.id,
      req.params.messageId,
      req.user.id,
      req.body.content
    );
    logAction(req, "message.edit", "Message", message._id, {});
    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deleteMessage(req, res) {
  try {
    const result = await messageService.deleteMessage(req.params.id, req.params.messageId, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "message.delete", "Message", req.params.messageId, {});
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreMessage(req, res) {
  try {
    const message = await messageService.restoreMessage(req.params.id, req.params.messageId, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "message.restore", "Message", message._id, {});
    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getUnreadCount(req, res) {
  try {
    const result = await messageService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createConversation,
  getConversation,
  listConversations,
  deleteConversation,
  restoreConversation,
  sendMessage,
  listMessages,
  markMessageRead,
  editMessage,
  deleteMessage,
  restoreMessage,
  getUnreadCount,
};
