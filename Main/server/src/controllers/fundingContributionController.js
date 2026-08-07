const fundingContributionService = require("../services/fundingContributionService");
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
    .createLog({ actor: req.user.id, action, targetType: "FundingContribution", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

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
    logAction(req, "fundingContribution.create", contribution._id, { fundingRoundId: req.body.fundingRoundId, amount: req.body.amount });
    return res.status(201).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getContribution(req, res) {
  try {
    const contribution = await fundingContributionService.getContributionForViewer(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
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

    const contributions = await fundingContributionService.listContributionsForUser(
      req.user.id,
      filter,
      options,
      { isAdmin: isPlatformAdmin(req) }
    );
    return res.status(200).json({ success: true, data: contributions });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function confirmContribution(req, res) {
  try {
    const contribution = await fundingContributionService.confirmContribution(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "fundingContribution.confirm", contribution._id, {});
    return res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function rejectContribution(req, res) {
  try {
    const contribution = await fundingContributionService.rejectContribution(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "fundingContribution.reject", contribution._id, {});
    return res.status(200).json({ success: true, data: contribution });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function withdraw(req, res) {
  try {
    const contribution = await fundingContributionService.withdraw(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "fundingContribution.withdraw", contribution._id, {});
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
