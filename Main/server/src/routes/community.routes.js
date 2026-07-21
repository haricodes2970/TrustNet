const express = require("express");
const communityController = require("../controllers/communityController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { communityCreate, communityUpdate } = require("../validators/community.validators");

const router = express.Router();

// Public read endpoints
router.get("/", communityController.listCommunities);
router.get("/:id", communityController.getCommunity);
router.get("/slug/:slug", communityController.getCommunityBySlug);

// Protected write endpoints
router.post("/", authenticate, validate(communityCreate), communityController.createCommunity);
router.put("/:id", authenticate, validate(communityUpdate), communityController.updateCommunity);
router.delete("/:id", authenticate, communityController.deleteCommunity);
router.post("/:id/join", authenticate, communityController.joinCommunity);
router.post("/:id/leave", authenticate, communityController.leaveCommunity);

module.exports = router;
