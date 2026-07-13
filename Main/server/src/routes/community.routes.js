const express = require("express");
const communityController = require("../controllers/communityController");

const router = express.Router();

router.post("/", communityController.createCommunity);
router.get("/", communityController.listCommunities);
router.get("/:id", communityController.getCommunity);
router.get("/slug/:slug", communityController.getCommunityBySlug);
router.put("/:id", communityController.updateCommunity);
router.delete("/:id", communityController.deleteCommunity);

module.exports = router;
