const express = require("express");
const { authenticate } = require("../middlewares/auth");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.use(authenticate);
router.get("/", dashboardController.getDashboard);

module.exports = router;
