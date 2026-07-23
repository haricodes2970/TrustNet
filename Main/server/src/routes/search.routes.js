const express = require("express");
const searchController = require("../controllers/searchController");
const { searchLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.get("/", searchLimiter, searchController.search);

module.exports = router;
