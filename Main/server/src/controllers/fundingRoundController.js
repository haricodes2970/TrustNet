const fundingRoundService = require("../services/fundingRoundService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

async function createRound(req, res) {
  try {
    const round = await fundingRoundService.createRound(
      {
        startupId: req.body.startupId,
        title: req.body.title,
        roundType: req.body.roundType,
        targetAmount: req.body.targetAmount,
        currency: req.body.currency,
        minimumContribution: req.body.minimumContribution,
        description: req.body.description,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: round });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getRound(req, res) {
  try {
    const round = await fundingRoundService.getRoundForViewer(req.params.id, req.user ? req.user.id : null);
    return res.status(200).json({ success: true, data: round });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listRounds(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.startupId) {
      filter.startup = req.query.startupId;
    }
    const rounds = await fundingRoundService.listRoundsForUser(
      req.user ? req.user.id : null,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: rounds });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateRound(req, res) {
  try {
    const round = await fundingRoundService.updateRound(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: round });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function openRound(req, res) {
  try {
    const round = await fundingRoundService.openRound(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: round });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function closeRound(req, res) {
  try {
    const round = await fundingRoundService.closeRound(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: round });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function cancelRound(req, res) {
  try {
    const round = await fundingRoundService.cancelRound(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: round });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createRound,
  getRound,
  listRounds,
  updateRound,
  openRound,
  closeRound,
  cancelRound,
};
