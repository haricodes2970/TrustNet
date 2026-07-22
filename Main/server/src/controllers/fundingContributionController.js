const fundingContributionService = require("../services/fundingContributionService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

async function createContribution(req, res) {
  try {
    const contribution = await fundingContributionService.createContribution(
      {
        fundingRoundId: req.body.fundingRoundId,
        amount: req.body.amount,
        currency: req.body.currency,
        note: req.body.note,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getContribution(req, res) {
  try {
    const contribution = await fundingContributionService.getContributionForViewer(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listContributions(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.fundingRoundId) {
      filter.fundingRound = req.query.fundingRoundId;
    }
    const contributions = await fundingContributionService.listContributionsForUser(
      req.user.id,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: contributions });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function confirmContribution(req, res) {
  try {
    const contribution = await fundingContributionService.confirmContribution(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function rejectContribution(req, res) {
  try {
    const contribution = await fundingContributionService.rejectContribution(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function withdraw(req, res) {
  try {
    const contribution = await fundingContributionService.withdraw(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createContribution,
  getContribution,
  listContributions,
  confirmContribution,
  rejectContribution,
  withdraw,
};
