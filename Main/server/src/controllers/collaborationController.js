const collaborationService = require("../services/collaborationService");

async function createCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.createCollaborationRequest(req.body);
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.getCollaborationRequestById(req.params.id);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function updateCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.updateCollaborationRequest(req.params.id, req.body);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteCollaborationRequest(req, res) {
  try {
    const request = await collaborationService.deleteCollaborationRequest(req.params.id);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function listCollaborationRequests(req, res) {
  try {
    const requests = await collaborationService.listCollaborationRequests(req.query.filter || {}, req.query.options || {});
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createCollaborationRequest,
  getCollaborationRequest,
  updateCollaborationRequest,
  deleteCollaborationRequest,
  listCollaborationRequests,
};
