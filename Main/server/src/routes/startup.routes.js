const express = require("express");
const startupController = require("../controllers/startupController");

const router = express.Router();

router.post("/", startupController.createStartup);
router.get("/", startupController.listStartups);
router.get("/:id", startupController.getStartup);
router.get("/slug/:slug", startupController.getStartupBySlug);
router.put("/:id", startupController.updateStartup);
router.delete("/:id", startupController.deleteStartup);

module.exports = router;
