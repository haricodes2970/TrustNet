const express = require("express");
const startupController = require("../controllers/startupController");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { startupCreate, startupUpdate } = require("../validators/startup.validators");

const router = express.Router();

// Public read endpoints. optionalAuthenticate never rejects - it just
// populates req.user (id + role) when a valid token is present, so
// getStartup/getStartupBySlug can let the founder or an admin see a
// private/draft/suspended startup while still 404-concealing it from
// everyone else, anonymous or not.
router.get("/", startupController.listStartups);
router.get("/:id", optionalAuthenticate, startupController.getStartup);
router.get("/slug/:slug", optionalAuthenticate, startupController.getStartupBySlug);

// Protected endpoints. authorize() with no role list still requires
// authenticate to have run and populates req.user.role - used here purely
// to let the controller check for an admin override, not to restrict access
// to a role list.
router.get("/me", authenticate, startupController.getMyStartups);
router.post("/", authenticate, validate(startupCreate), startupController.createStartup);
router.put("/:id", authenticate, authorize(), validate(startupUpdate), startupController.updateStartup);
router.delete("/:id", authenticate, authorize(), startupController.deleteStartup);
router.post("/:id/restore", authenticate, authorize(), startupController.restoreStartup);

module.exports = router;
