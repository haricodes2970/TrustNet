const engagementRequestService = require("../services/engagementRequestService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

async function createRequest(req, res) {
  try {
    const request = await engagementRequestService.createRequest(
      {
        serviceListingId: req.body.serviceListingId,
        startupId: req.body.startupId,
        message: req.body.message,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getRequest(req, res) {
  try {
    const request = await engagementRequestService.getRequestForViewer(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listRequests(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.startupId) {
      filter.startup = req.query.startupId;
    }
    if (req.query.serviceListingId) {
      filter.serviceListing = req.query.serviceListingId;
    }
    const requests = await engagementRequestService.listRequestsForUser(
      req.user.id,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const request = await engagementRequestService.updateStatus(req.params.id, req.user.id, {
      status: req.body.status,
    });
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function cancelRequest(req, res) {
  try {
    const request = await engagementRequestService.cancelRequest(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createRequest,
  getRequest,
  listRequests,
  updateStatus,
  cancelRequest,
};
