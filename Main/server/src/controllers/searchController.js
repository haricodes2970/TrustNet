const searchService = require("../services/searchService");

async function search(req, res) {
  try {
    const query = req.query.q || "";
    const data = await searchService.globalSearch(query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { search };
