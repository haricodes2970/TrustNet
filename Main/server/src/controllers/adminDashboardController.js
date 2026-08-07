const adminDashboardService = require("../services/adminDashboardService");

async function getOverview(req, res) {
  try {
    const overview = await adminDashboardService.getOverview();
    return res.status(200).json({ success: true, data: overview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getOverview };
