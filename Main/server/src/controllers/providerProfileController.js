const providerProfileService = require("../services/providerProfileService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

function isPlatformAdmin(req) {
  return Boolean(req.user) && req.user.role === "admin";
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "ProviderProfile", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createProfile(req, res) {
  try {
    const profile = await providerProfileService.createProfile(
      {
        businessName: req.body.businessName,
        tagline: req.body.tagline,
        description: req.body.description,
        serviceCategories: req.body.serviceCategories,
        portfolioUrl: req.body.portfolioUrl,
      },
      req.user.id
    );
    logAction(req, "providerProfile.create", profile._id, {});
    return res.status(201).json({ success: true, data: profile });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getProfile(req, res) {
  try {
    const viewer = req.user ? { id: req.user.id, role: req.user.role } : {};
    const profile = await providerProfileService.getProfileForViewer(req.params.id, viewer);
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listProfiles(req, res) {
  try {
    const profiles = await providerProfileService.listProfiles(req.query.filter || {}, req.query.options || {}, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: profiles });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const profile = await providerProfileService.updateProfile(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "providerProfile.update", profile._id, {});
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createProfile,
  getProfile,
  listProfiles,
  updateProfile,
};
