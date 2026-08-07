const investmentInterestService = require("../services/investmentInterestService");
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
    .createLog({ actor: req.user.id, action, targetType: "InvestmentInterest", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createInterest(req, res) {
  try {
    const interest = await investmentInterestService.createInterest(
      { startupId: req.body.startupId, message: req.body.message },
      req.user.id
    );
    logAction(req, "investmentInterest.create", interest._id, { startupId: req.body.startupId });
    return res.status(201).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getInterest(req, res) {
  try {
    const interest = await investmentInterestService.getInterestForViewer(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listInterests(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.startupId) {
      filter.startup = req.query.startupId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const interests = await investmentInterestService.listInterestsForUser(req.user.id, filter, options, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: interests });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const interest = await investmentInterestService.updateStatus(
      req.params.id,
      req.user.id,
      { status: req.body.status },
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "investmentInterest.update_status", interest._id, { status: req.body.status });
    return res.status(200).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveInterest(req, res) {
  try {
    const interest = await investmentInterestService.archiveInterest(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "investmentInterest.archive", interest._id, {});
    return res.status(200).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreInterest(req, res) {
  try {
    const interest = await investmentInterestService.restoreInterest(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "investmentInterest.restore", interest._id, {});
    return res.status(200).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function withdraw(req, res) {
  try {
    const interest = await investmentInterestService.withdraw(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "investmentInterest.withdraw", interest._id, {});
    return res.status(200).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createInterest,
  getInterest,
  listInterests,
  updateStatus,
  archiveInterest,
  restoreInterest,
  withdraw,
};
