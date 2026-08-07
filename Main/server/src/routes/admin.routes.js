const express = require("express");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const adminVerificationController = require("../controllers/adminVerificationController");

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin"));

router.get("/me", adminVerificationController.getMe);
router.get("/verifications", adminVerificationController.listVerifications);
router.get("/verifications/:userId", adminVerificationController.getVerification);
router.post("/verifications/:userId/approve", adminVerificationController.approveVerification);
router.post("/verifications/:userId/reject", adminVerificationController.rejectVerification);
router.post("/verifications/:userId/request-resubmission", adminVerificationController.requestResubmission);

module.exports = router;
