const searchService = require("../services/searchService");
const ApiError = require("../utils/ApiError");

const VALID_TYPES = ["users", "startups", "communities", "posts", "listings"];

async function search(req, res) {
  try {
    const query = req.query.q || "";
    const type = VALID_TYPES.includes(req.query.type) ? req.query.type : undefined;
    const data = await searchService.globalSearch(query, {
      type,
      limit: req.query.limit,
      skip: req.query.skip,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = { search };
