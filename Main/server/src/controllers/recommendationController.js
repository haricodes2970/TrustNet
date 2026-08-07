const recommendationService = require("../services/recommendationService");
const ApiError = require("../utils/ApiError");

// Previously resolved the acting user via req.user?.email ->
// userService.getUserByEmail() inside the service itself. authenticate
// already guarantees req.user.id references a real, persisted User (this
// route also requires auth), so req.user.id is used directly - same fix
// already applied to messageController/notificationController and
// interactionService this session.

async function getRecommendations(req, res) {
  try {
    const data = await recommendationService.getRecommendations(req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = { getRecommendations };
