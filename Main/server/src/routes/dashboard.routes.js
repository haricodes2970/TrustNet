const express = require("express");
const { authenticate } = require("../middlewares/auth");
const { requireApprovedVerification } = require("../middlewares/verification");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(authenticate);
router.use(requireApprovedVerification);
router.get("/", dashboardController.getDashboard);

module.exports = router;
