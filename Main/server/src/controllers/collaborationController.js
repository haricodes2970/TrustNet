const collaborationService = require("../services/collaborationService");
const ApiError = require("../utils/ApiError");

// Every handler derives the acting user from req.user.id (set by the
// authenticate middleware), never from the request body - see
// collaborationService.js's header for the Phase 17 finding this fixes.
function statusOf(error) {
  return error instanceof ApiError ? error.statusCode : 500;
}

async function createCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.createCollaborationRequest(req.user.id, req.body);
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function getCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.getCollaborationRequestById(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.updateCollaborationRequest(req.user.id, req.params.id, req.body);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function deleteCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.deleteCollaborationRequest(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function listCollaborationRequests(req, res) {
  try {
    const requests = await collaborationService.listCollaborationRequests(req.user.id, {
      direction: req.query.direction,
      status: req.query.status,
      limit: req.query.limit,
      skip: req.query.skip,
    });
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createCollaborationRequest,
  getCollaborationRequest,
  updateCollaborationRequest,
  deleteCollaborationRequest,
  listCollaborationRequests,
};
