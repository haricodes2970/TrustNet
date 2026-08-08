const mongoose = require("mongoose");
const CollaborationRequest = require("../models/CollaborationRequest");
const User = require("../models/User");
const notificationService = require("./notificationService");
const ApiError = require("../utils/ApiError");
const { handleServiceError } = require("./serviceUtils");

// Phase 17 (final audit): this module was mounted at /api/v1/collaborations
// with NO authentication middleware at all, and every handler took its
// identity straight from the request body or an arbitrary caller-supplied
// Mongo filter. That allowed, unauthenticated: dumping every collaboration
// request on the platform (including their private `message` bodies),
// reading/updating/deleting any request by id, and creating a request with
// a forged `sender` (impersonation + notification spam). Every other
// module in this codebase already derives the actor from req.user.id and
// enforces ownership in the service layer; this file now does the same.
//
// Authorization model, matching the messaging/engagement-request
// convention already established elsewhere:
//   - sender is ALWAYS req.user.id, never client-supplied
//   - only the sender or the recipient may read a request
//   - only the recipient may accept/reject it (with a response message)
//   - only the sender may withdraw or delete it
//   - listing is always scoped to the caller (sender OR recipient)

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function clampSkip(skip) {
  const parsed = Number(skip);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function assertValidId(id, label = "collaboration request") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label} ID.`);
  }
}

function isParticipant(request, userId) {
  return String(request.sender) === String(userId) || String(request.recipient) === String(userId);
}

async function loadRequest(id) {
  assertValidId(id);
  const request = await CollaborationRequest.findById(id).lean();
  if (!request) {
    throw new ApiError(404, "Collaboration request not found.");
  }
  return request;
}

async function createCollaborationRequest(userId, data = {}) {
  try {
    assertValidId(data.recipient, "recipient");
    if (String(data.recipient) === String(userId)) {
      throw new ApiError(400, "You cannot send a collaboration request to yourself.");
    }

    // The recipient must be a real, active, non-deleted account - the same
    // "the other party's account is active" check every other cross-user
    // module in this codebase performs before creating a record.
    const recipient = await User.findById(data.recipient).select("isActive deletedAt");
    if (!recipient || recipient.deletedAt || recipient.isActive === false) {
      throw new ApiError(404, "Recipient not found.");
    }

    // Explicit whitelist - `sender` and `status` are never taken from the
    // client, closing the impersonation and self-accept paths.
    const request = await CollaborationRequest.create({
      sender: userId,
      recipient: data.recipient,
      startup: data.startup || null,
      type: data.type,
      subject: data.subject,
      message: data.message,
    });

    notificationService
      .createNotification({
        recipient: request.recipient,
        type: "collaboration_request",
        title: "New collaboration request",
        message: "You received a new collaboration request.",
        data: { collaborationRequestId: request._id, sender: request.sender, type: request.type },
      })
      .catch(() => {
        // Notifications must never block the primary request.
      });

    return request.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create collaboration request.");
  }
}

async function getCollaborationRequestById(userId, id) {
  try {
    const request = await loadRequest(id);
    if (!isParticipant(request, userId)) {
      throw new ApiError(403, "You are not authorized to view this collaboration request.");
    }
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch collaboration request.");
  }
}

// Recipient responds (accept/reject); sender withdraws. Nothing else about
// the record is client-mutable - the message body, participants, and
// startup link are fixed at creation time.
async function updateCollaborationRequest(userId, id, updateData = {}) {
  try {
    const request = await loadRequest(id);
    if (!isParticipant(request, userId)) {
      throw new ApiError(403, "You are not authorized to update this collaboration request.");
    }
    if (request.status !== "pending") {
      throw new ApiError(409, `This collaboration request has already been ${request.status}.`);
    }

    const isRecipient = String(request.recipient) === String(userId);
    const status = updateData.status;

    if (status === "accepted" || status === "rejected") {
      if (!isRecipient) {
        throw new ApiError(403, "Only the recipient can accept or reject a collaboration request.");
      }
    } else if (status === "withdrawn") {
      if (isRecipient) {
        throw new ApiError(403, "Only the sender can withdraw a collaboration request.");
      }
    } else {
      throw new ApiError(400, "Status must be one of: accepted, rejected, withdrawn.");
    }

    const update = { status };
    if (updateData.responseMessage !== undefined) {
      update.responseMessage = updateData.responseMessage;
    }

    // Condition-checked update - two concurrent responses cannot both win.
    const updated = await CollaborationRequest.findOneAndUpdate(
      { _id: id, status: "pending" },
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw new ApiError(409, "This collaboration request was already responded to.");
    }

    notificationService
      .createNotification({
        recipient: isRecipient ? request.sender : request.recipient,
        type: "collaboration_request",
        title: `Collaboration request ${status}`,
        message: `Your collaboration request was ${status}.`,
        data: { collaborationRequestId: updated._id, status },
      })
      .catch(() => {});

    return updated;
  } catch (error) {
    throw handleServiceError(error, "Failed to update collaboration request.");
  }
}

async function deleteCollaborationRequest(userId, id) {
  try {
    const request = await loadRequest(id);
    if (String(request.sender) !== String(userId)) {
      throw new ApiError(403, "Only the sender can delete a collaboration request.");
    }
    await CollaborationRequest.findByIdAndDelete(id);
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete collaboration request.");
  }
}

// Always scoped to the caller - there is no platform-wide listing, and no
// caller-supplied Mongo filter is accepted. `direction` and `status` are
// the only supported narrowing options.
async function listCollaborationRequests(userId, { direction, status, limit, skip } = {}) {
  try {
    const filter = {};
    if (direction === "sent") filter.sender = userId;
    else if (direction === "received") filter.recipient = userId;
    else filter.$or = [{ sender: userId }, { recipient: userId }];

    if (status && ["pending", "accepted", "rejected", "withdrawn"].includes(status)) {
      filter.status = status;
    }

    return CollaborationRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(clampSkip(skip))
      .limit(clampLimit(limit))
      .lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list collaboration requests.");
  }
}

module.exports = {
  createCollaborationRequest,
  getCollaborationRequestById,
  updateCollaborationRequest,
  deleteCollaborationRequest,
  listCollaborationRequests,
};
