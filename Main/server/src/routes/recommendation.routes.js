const express = require("express");
const { authenticate } = require("../middlewares/auth");
const recommendationController = require("../controllers/recommendationController");

const router = express.Router();

router.use(authenticate);
router.get("/", recommendationController.getRecommendations);

module.exports = router;
