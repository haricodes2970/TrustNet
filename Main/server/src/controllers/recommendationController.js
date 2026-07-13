const recommendationService = require("../services/recommendationService");

async function getRecommendations(req, res) {
  try {
    const data = await recommendationService.getRecommendations(req.user?.email);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { getRecommendations };
