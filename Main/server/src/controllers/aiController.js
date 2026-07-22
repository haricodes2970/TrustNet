const aiService = require("../services/aiService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

async function generateInsight(req, res) {
  try {
    const { capability, startupId, projectId, section, reportType, question } = req.body;
    const result = await aiService.generateInsight(
      capability,
      { startupId, projectId, section, reportType, question },
      req.user.id
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  generateInsight,
};
