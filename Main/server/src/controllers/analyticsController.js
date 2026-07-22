const analyticsService = require("../services/analyticsService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure. No business
// logic, no authorization logic, no aggregation here — every computation
// lives in analyticsService.js.

async function getOverview(req, res) {
  try {
    const data = await analyticsService.getOverview(req.query.startupId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getProjects(req, res) {
  try {
    const data = await analyticsService.getProjectAnalytics(req.query.startupId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getTasks(req, res) {
  try {
    const data = await analyticsService.getTaskAnalytics(req.query.startupId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getHiring(req, res) {
  try {
    const data = await analyticsService.getHiringAnalytics(req.query.startupId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getFunding(req, res) {
  try {
    const data = await analyticsService.getFundingAnalytics(req.query.startupId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getMarketplace(req, res) {
  try {
    const data = await analyticsService.getMarketplaceAnalytics(req.query.startupId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  getOverview,
  getProjects,
  getTasks,
  getHiring,
  getFunding,
  getMarketplace,
};
