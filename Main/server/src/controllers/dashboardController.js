const dashboardService = require("../services/dashboardService");

async function getDashboard(req, res) {
  try {
    const data = await dashboardService.getDashboard(req.user.email);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { getDashboard };
