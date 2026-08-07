const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const notificationService = require("./notificationService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Error typing: 404 not found, 403 not-a-participant / not-the-sender, 409
// state conflict (deleted conversation/message, inactive participant,
// duplicate restore-of-non-deleted). Malformed input is rejected by the
// validator (400) before reaching this file.

function uniqueIds(ids) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    const str = String(id);
    if (!seen.has(str)) {
      seen.add(str);
      result.push(id);
    }
  }
  return result;
}

function isAccountActive(user) {
  return Boolean(user) && user.isActive !== false && !user.deletedAt;
}

function assertParticipant(conversation, userId) {
  if (!conversation.participants.some((p) => String(p) === String(userId))) {
    throw new ApiError(403, "You are not a participant of this conversation.");
  }
}

// sent -> delivered -> read, derived fresh from readBy every time rather
// than trusted as a separately-mutated field - readBy always includes the
// sender (added at send time), so a naive "readBy.length >= 1" check (the
// previous implementation) was true immediately on send and never reflected
// whether anyone ELSE had actually read it.
function computeMessageStatus(readBy, senderId, participants) {
  const others = participants.filter((p) => String(p) !== String(senderId));
  if (others.length === 0) {
    return "read";
  }
  const readByOthers = others.filter((p) => readBy.some((r) => String(r) === String(p)));
  if (readByOthers.length === 0) {
    return "sent";
  }
  if (readByOthers.length === others.length) {
    return "read";
  }
  return "delivered";
}

async function createConversation(data) {
  try {
    const createdBy = data.createdBy;
    const participantIds = uniqueIds([...(data.participants || []), createdBy]);

    if (participantIds.length < 2) {
      throw new ApiError(400, "A conversation requires at least two participants.");
    }
    if (data.type === "direct" && participantIds.length !== 2) {
      throw new ApiError(400, "A direct conversation can only have two participants.");
    }

    // Deleted/suspended-participant guard - only checked at creation, same
    // "guard only at the create boundary" convention every other module in
    // this codebase uses (not re-checked on every subsequent message).
    const otherIds = participantIds.filter((id) => String(id) !== String(createdBy));
    const otherUsers = await User.find({ _id: { $in: otherIds } })
      .select("isActive deletedAt")
      .lean();
    if (otherUsers.length !== otherIds.length) {
      throw new ApiError(404, "One or more participants could not be found.");
    }
    if (otherUsers.some((u) => !isAccountActive(u))) {
      throw new ApiError(409, "One or more participants are not currently active.");
    }

    if (data.type === "direct") {
      const existing = await Conversation.findOne({
        type: "direct",
        deletedAt: null,
        participants: { $all: participantIds, $size: participantIds.length },
      });
      if (existing) {
        return existing;
      }
    }

    const conversation = await Conversation.create({
      participants: participantIds,
      type: data.type || "direct",
      title: data.title || "",
      createdBy: createdBy || undefined,
      lastActivityAt: new Date(),
    });

    return conversation;
  } catch (error) {
    throw handleServiceError(error, "Failed to create conversation.");
  }
}

async function getConversationById(id, userId, { isAdmin = false } = {}) {
  try {
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    if (!isAdmin) {
      assertParticipant(conversation, userId);
    }
    return conversation;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch conversation.");
  }
}

// isArchived/deletedAt default to excluded (override-friendly, same
// pattern every list endpoint in this codebase uses); `participants` is
// forced to the caller after the spread so no filter can widen it to
// another user's conversations.
async function listConversations(userId, filter = {}, options = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { ...rest, participants: userId };
    if (base.isArchived === undefined) base.isArchived = false;
    if (base.deletedAt === undefined) base.deletedAt = null;
    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      base.title = new RegExp(escaped, "i");
    }

    const query = Conversation.find(base).sort({ lastActivityAt: -1 });
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list conversations.");
  }
}

// Was a hard delete that also hard-deleted every Message via
// Message.deleteMany - a single participant's action permanently destroyed
// the entire conversation history for every other participant with no way
// back. Soft delete now (any participant, or a platform admin, can delete/
// restore - shared-state, matching this codebase's uniform soft-delete
// convention everywhere else, not a per-user hide list). Messages
// themselves are left untouched; the conversation's own deletedAt is
// enough to conceal the whole thread via the same "check parent state"
// pattern used throughout this codebase.
async function deleteConversation(id, userId, { isAdmin = false } = {}) {
  try {
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    if (!isAdmin) {
      assertParticipant(conversation, userId);
    }

    const updated = await Conversation.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).lean();
    return updated;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete conversation.");
  }
}

async function restoreConversation(id, userId, { isAdmin = false } = {}) {
  try {
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    if (!isAdmin) {
      assertParticipant(conversation, userId);
    }
    if (!conversation.deletedAt) {
      throw new ApiError(409, "This conversation is not deleted.");
    }

    const updated = await Conversation.findByIdAndUpdate(id, { deletedAt: null }, { new: true }).lean();
    return updated;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore conversation.");
  }
}

async function sendMessage(data) {
  try {
    const conversation = await Conversation.findById(data.conversationId);
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    assertParticipant(conversation, data.senderId);
    if (conversation.deletedAt) {
      throw new ApiError(409, "This conversation has been deleted. Restore it before sending new messages.");
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: data.senderId,
      content: data.content,
      attachments: data.attachments || [],
      replyTo: data.replyTo || null,
      readBy: [data.senderId],
    });

    conversation.lastMessage = {
      content: data.content,
      sender: data.senderId,
      sentAt: message.createdAt,
    };
    conversation.lastActivityAt = message.createdAt;
    await conversation.save();

    const otherParticipants = conversation.participants.filter(
      (p) => String(p) !== String(data.senderId)
    );
    for (const recipient of otherParticipants) {
      try {
        await notificationService.createNotification({
          recipient,
          type: "message",
          title: "New message",
          message: "You received a new message.",
          data: {
            conversationId: conversation._id,
            sender: data.senderId,
            messageId: message._id,
          },
        });
      } catch (notifyError) {
        // Notifications must never block the primary request.
      }
    }

    return message;
  } catch (error) {
    throw handleServiceError(error, "Failed to send message.");
  }
}

// deletedAt defaults to excluded (override-friendly); `conversation` is
// forced after the spread for the same reason listConversations forces
// `participants`. Platform admin bypasses the participant check (view/
// moderation only - sending is always as a real participant, no
// send-on-behalf-of feature exists or was requested).
async function listMessages(conversationId, userId, filter = {}, options = {}, { isAdmin = false } = {}) {
  try {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    if (!isAdmin) {
      assertParticipant(conversation, userId);
    }

    const { search, ...rest } = normalizeFilter(filter);
    const base = { ...rest, conversation: conversationId };
    if (base.deletedAt === undefined) base.deletedAt = null;
    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      base.content = new RegExp(escaped, "i");
    }

    const query = Message.find(base).sort({ createdAt: 1 });
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list messages.");
  }
}

// Previously had NO authorization check at all - any authenticated caller
// who knew a conversationId/messageId pair could mark it read regardless of
// whether they were a participant. Also previously a non-atomic
// fetch-mutate-.save() - now a single atomic $addToSet, race-free
// regardless of how many participants mark read concurrently.
async function markMessageRead(conversationId, messageId, userId) {
  try {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    assertParticipant(conversation, userId);

    const existing = await Message.findById(messageId).lean();
    if (!existing || String(existing.conversation) !== String(conversationId) || existing.deletedAt) {
      throw new ApiError(404, "Message not found.");
    }

    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    ).lean();

    const status = computeMessageStatus(message.readBy, message.sender, conversation.participants);
    if (status !== message.status) {
      await Message.findByIdAndUpdate(messageId, { status });
      message.status = status;
    }

    return message;
  } catch (error) {
    throw handleServiceError(error, "Failed to mark message as read.");
  }
}

async function editMessage(conversationId, messageId, userId, content) {
  try {
    const message = await Message.findById(messageId);
    if (!message || String(message.conversation) !== String(conversationId)) {
      throw new ApiError(404, "Message not found.");
    }
    if (String(message.sender) !== String(userId)) {
      throw new ApiError(403, "You can only edit your own messages.");
    }
    if (message.deletedAt) {
      throw new ApiError(409, "This message has been deleted. Restore it before editing.");
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Refresh the conversation's cached preview only if this message is
    // actually the latest one (exact _id match, not a fragile content
    // guess).
    const latest = await Message.findOne({ conversation: conversationId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    if (latest && String(latest._id) === String(message._id)) {
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: { content: message.content, sender: message.sender, sentAt: message.createdAt },
      });
    }

    return message.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to edit message.");
  }
}

// Was a hard delete (findByIdAndDelete) despite isEdited/editedAt already
// existing on the schema implying an edit/undo lifecycle was intended. Soft
// delete + restoreMessage now. A platform admin may delete (not restore
// someone else's) any message; restoring stays sender-only (matches the
// Comment precedent - moderation removal is an admin action, undoing a
// user's own deletion is not).
async function deleteMessage(conversationId, messageId, userId, { isAdmin = false } = {}) {
  try {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    if (!isAdmin) {
      assertParticipant(conversation, userId);
    }

    const message = await Message.findById(messageId);
    if (!message || String(message.conversation) !== String(conversationId)) {
      throw new ApiError(404, "Message not found.");
    }
    if (!isAdmin && String(message.sender) !== String(userId)) {
      throw new ApiError(403, "You can only delete your own messages.");
    }
    if (message.deletedAt) {
      throw new ApiError(409, "This message has already been deleted.");
    }

    message.deletedAt = new Date();
    await message.save();

    // Keep the conversation's cached preview from showing deleted content -
    // always recompute rather than fragile-match the deleted message
    // against the cache, cheap single indexed query either way.
    const latest = await Message.findOne({ conversation: conversationId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    const update = latest
      ? { lastMessage: { content: latest.content, sender: latest.sender, sentAt: latest.createdAt } }
      : { $unset: { lastMessage: "" } };
    await Conversation.findByIdAndUpdate(conversationId, update);

    return { id: message._id, deleted: true };
  } catch (error) {
    throw handleServiceError(error, "Failed to delete message.");
  }
}

async function restoreMessage(conversationId, messageId, userId, { isAdmin = false } = {}) {
  try {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      throw new ApiError(404, "Conversation not found.");
    }
    if (conversation.deletedAt) {
      throw new ApiError(409, "The conversation has been deleted. Restore it first.");
    }

    const message = await Message.findById(messageId);
    if (!message || String(message.conversation) !== String(conversationId)) {
      throw new ApiError(404, "Message not found.");
    }
    if (!isAdmin && String(message.sender) !== String(userId)) {
      throw new ApiError(403, "You can only restore your own messages.");
    }
    if (!message.deletedAt) {
      throw new ApiError(409, "This message is not deleted.");
    }

    message.deletedAt = null;
    await message.save();

    const latest = await Message.findOne({ conversation: conversationId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    if (latest && String(latest._id) === String(message._id)) {
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: { content: latest.content, sender: latest.sender, sentAt: latest.createdAt },
        lastActivityAt: latest.createdAt,
      });
    }

    return message.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to restore message.");
  }
}

async function getUnreadCount(userId) {
  try {
    const conversations = await Conversation.find({ participants: userId, deletedAt: null })
      .select("_id")
      .lean();
    const conversationIds = conversations.map((c) => c._id);

    const count = await Message.countDocuments({
      conversation: { $in: conversationIds },
      deletedAt: null,
      readBy: { $ne: userId },
      sender: { $ne: userId },
    });

    return { unreadCount: count };
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch unread count.");
  }
}

module.exports = {
  createConversation,
  getConversationById,
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
