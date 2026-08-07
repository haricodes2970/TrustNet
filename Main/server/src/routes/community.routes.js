const express = require("express");
const communityController = require("../controllers/communityController");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { communityCreate, communityUpdate } = require("../validators/community.validators");

const router = express.Router();

// Public read endpoints - optionalAuthenticate lets an owner/admin see a
// hidden/deleted community that would otherwise be 404-concealed, without
// requiring a token for everyone else.
router.get("/", optionalAuthenticate, communityController.listCommunities);
router.get("/:id", optionalAuthenticate, communityController.getCommunity);
router.get("/slug/:slug", optionalAuthenticate, communityController.getCommunityBySlug);

// Protected write endpoints. authorize() (no role list) populates
// req.user.role for the platform-admin override.
router.post("/", authenticate, validate(communityCreate), communityController.createCommunity);
router.put("/:id", authenticate, authorize(), validate(communityUpdate), communityController.updateCommunity);
router.delete("/:id", authenticate, authorize(), communityController.deleteCommunity);
router.post("/:id/restore", authenticate, authorize(), communityController.restoreCommunity);
router.post("/:id/join", authenticate, communityController.joinCommunity);
router.post("/:id/leave", authenticate, communityController.leaveCommunity);

module.exports = router;
