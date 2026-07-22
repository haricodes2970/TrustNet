const investmentInterestService = require("../services/investmentInterestService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

async function createInterest(req, res) {
  try {
    const interest = await investmentInterestService.createInterest(
      { startupId: req.body.startupId, message: req.body.message },
      req.user.id
    );
    return res.status(201).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getInterest(req, res) {
  try {
    const interest = await investmentInterestService.getInterestForViewer(req.params.id, req.user.id);
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
    const interests = await investmentInterestService.listInterestsForUser(
      req.user.id,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: interests });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const interest = await investmentInterestService.updateStatus(req.params.id, req.user.id, {
      status: req.body.status,
    });
    return res.status(200).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveInterest(req, res) {
  try {
    const interest = await investmentInterestService.archiveInterest(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: interest });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function withdraw(req, res) {
  try {
    const interest = await investmentInterestService.withdraw(req.params.id, req.user.id);
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
  withdraw,
};
