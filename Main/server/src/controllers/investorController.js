const investorService = require("../services/investorService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

async function createProfile(req, res) {
  try {
    const profile = await investorService.createProfile(
      {
        organization: req.body.organization,
        investmentThesis: req.body.investmentThesis,
        preferredStages: req.body.preferredStages,
        preferredIndustries: req.body.preferredIndustries,
        preferredRegions: req.body.preferredRegions,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: profile });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getProfile(req, res) {
  try {
    const profile = await investorService.getProfileById(req.params.id);
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listProfiles(req, res) {
  try {
    const profiles = await investorService.listProfiles(req.query.filter || {}, req.query.options || {});
    return res.status(200).json({ success: true, data: profiles });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const profile = await investorService.updateProfile(req.params.id, req.user.id, req.body);
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
