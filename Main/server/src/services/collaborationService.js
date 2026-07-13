const CollaborationRequest = require("../models/CollaborationRequest");
const notificationService = require("./notificationService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

async function createCollaborationRequest(data) {
  try {
    const request = await CollaborationRequest.create(data);

    try {
      await notificationService.createNotification({
        recipient: request.recipient,
        type: "collaboration_request",
        title: "New collaboration request",
        message: "You received a new collaboration request.",
        data: {
          collaborationRequestId: request._id,
          sender: request.sender,
          type: request.type,
        },
      });
    } catch (notifyError) {
      // Notifications must never block the primary request.
    }

    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to create collaboration request.");
  }
}

async function getCollaborationRequestById(id) {
  try {
    const request = await CollaborationRequest.findById(id).lean();
    if (!request) {
      throw new Error("Collaboration request not found.");
    }
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch collaboration request.");
  }
}

async function updateCollaborationRequest(id, updateData) {
  try {
    const request = await CollaborationRequest.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!request) {
      throw new Error("Collaboration request not found.");
    }

    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to update collaboration request.");
  }
}

async function deleteCollaborationRequest(id) {
  try {
    const request = await CollaborationRequest.findByIdAndDelete(id);
    if (!request) {
      throw new Error("Collaboration request not found.");
    }
    return request;
  } catch (error) {
    throw handleServiceError(error, "Failed to delete collaboration request.");
  }
}

async function listCollaborationRequests(filter = {}, options = {}) {
  try {
    const query = CollaborationRequest.find(normalizeFilter(filter));
    return applyQueryOptions(query, options).lean();
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
