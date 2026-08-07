const engagementRequestService = require("../services/engagementRequestService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

function isPlatformAdmin(req) {
  return req.user.role === "admin";
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "EngagementRequest", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

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
    logAction(req, "engagementRequest.create", request._id, {
      serviceListingId: req.body.serviceListingId,
      startupId: req.body.startupId,
    });
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getRequest(req, res) {
  try {
    const request = await engagementRequestService.getRequestForViewer(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
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
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      filter.search = req.query.search;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const requests = await engagementRequestService.listRequestsForUser(req.user.id, filter, options, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const request = await engagementRequestService.updateStatus(
      req.params.id,
      req.user.id,
      { status: req.body.status },
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "engagementRequest.status", request._id, { status: req.body.status });
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function cancelRequest(req, res) {
  try {
    const request = await engagementRequestService.cancelRequest(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "engagementRequest.cancel", request._id, {});
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
