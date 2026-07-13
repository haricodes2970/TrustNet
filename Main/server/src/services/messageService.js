const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const notificationService = require("./notificationService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

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

async function createConversation(data) {
  try {
    const createdBy = data.createdBy;
    const participantIds = uniqueIds([...(data.participants || []), createdBy]);

    if (participantIds.length < 2) {
      throw new Error("A conversation requires at least two participants.");
    }

    if (data.type === "direct" && participantIds.length !== 2) {
      throw new Error("A direct conversation can only have two participants.");
    }

    if (data.type === "direct") {
      const existing = await Conversation.findOne({
        type: "direct",
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

async function getConversationById(id, userId) {
  try {
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    if (!conversation.participants.some((p) => String(p) === String(userId))) {
      throw new Error("You are not a participant of this conversation.");
    }
    return conversation;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch conversation.");
  }
}

async function listConversations(userId, options = {}) {
  try {
    const query = Conversation.find({ participants: userId, isArchived: false }).sort({
      lastActivityAt: -1,
    });
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list conversations.");
  }
}

async function deleteConversation(id, userId) {
  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    if (!conversation.participants.some((p) => String(p) === String(userId))) {
      throw new Error("You are not a participant of this conversation.");
    }

    await Message.deleteMany({ conversation: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);

    return { id: conversation._id, deleted: true };
  } catch (error) {
    throw handleServiceError(error, "Failed to delete conversation.");
  }
}

async function sendMessage(data) {
  try {
    const conversation = await Conversation.findById(data.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    if (!conversation.participants.some((p) => String(p) === String(data.senderId))) {
      throw new Error("You are not a participant of this conversation.");
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

async function listMessages(conversationId, userId, options = {}) {
  try {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      throw new Error("Conversation not found.");
    }
    if (!conversation.participants.some((p) => String(p) === String(userId))) {
      throw new Error("You are not a participant of this conversation.");
    }

    const query = Message.find({ conversation: conversationId }).sort({ createdAt: 1 });
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list messages.");
  }
}

async function markMessageRead(conversationId, messageId, userId) {
  try {
    const message = await Message.findById(messageId);
    if (!message || String(message.conversation) !== String(conversationId)) {
      throw new Error("Message not found.");
    }
    if (!message.readBy.some((u) => String(u) === String(userId))) {
      message.readBy.push(userId);
    }
    if (message.readBy.length >= 1) {
      message.status = "read";
    }
    await message.save();

    return message;
  } catch (error) {
    throw handleServiceError(error, "Failed to mark message as read.");
  }
}

async function deleteMessage(conversationId, messageId, userId) {
  try {
    const message = await Message.findById(messageId);
    if (!message || String(message.conversation) !== String(conversationId)) {
      throw new Error("Message not found.");
    }
    if (String(message.sender) !== String(userId)) {
      throw new Error("You can only delete your own messages.");
    }

    await Message.findByIdAndDelete(message._id);

    return { id: message._id, deleted: true };
  } catch (error) {
    throw handleServiceError(error, "Failed to delete message.");
  }
}

async function getUnreadCount(userId) {
  try {
    const conversations = await Conversation.find({ participants: userId }).lean();
    const conversationIds = conversations.map((c) => c._id);

    const count = await Message.countDocuments({
      conversation: { $in: conversationIds },
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
  sendMessage,
  listMessages,
  markMessageRead,
  deleteMessage,
  getUnreadCount,
};
