const express = require("express");
const collaborationController = require("../controllers/collaborationController");

const router = express.Router();

router.get("/", collaborationController.listCollaborationRequests);
router.post("/request", collaborationController.createCollaborationRequest);
router.get("/:id", collaborationController.getCollaborationRequest);
router.put("/:id", collaborationController.updateCollaborationRequest);
router.delete("/:id", collaborationController.deleteCollaborationRequest);

module.exports = router;
