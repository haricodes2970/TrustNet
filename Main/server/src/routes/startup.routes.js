const express = require("express");
const startupController = require("../controllers/startupController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { startupCreate, startupUpdate } = require("../validators/startup.validators");

const router = express.Router();

// Public read endpoints
router.get("/", startupController.listStartups);
router.get("/:id", startupController.getStartup);
router.get("/slug/:slug", startupController.getStartupBySlug);

// Protected endpoints
router.get("/me", authenticate, startupController.getMyStartups);
router.post("/", authenticate, validate(startupCreate), startupController.createStartup);
router.put("/:id", authenticate, validate(startupUpdate), startupController.updateStartup);
router.delete("/:id", authenticate, startupController.deleteStartup);

module.exports = router;
