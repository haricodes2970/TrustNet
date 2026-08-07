const express = require("express");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const adminValidators = require("../validators/admin.validators");
const adminVerificationController = require("../controllers/adminVerificationController");
const adminDashboardController = require("../controllers/adminDashboardController");
const adminUserController = require("../controllers/adminUserController");
const adminModerationController = require("../controllers/adminModerationController");
const adminStartupController = require("../controllers/adminStartupController");
const adminActivityController = require("../controllers/adminActivityController");

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin"));

router.get("/me", adminVerificationController.getMe);
router.get("/dashboard/overview", adminDashboardController.getOverview);
router.get("/verifications", adminVerificationController.listVerifications);
router.get("/verifications/:userId", adminVerificationController.getVerification);
router.post("/verifications/:userId/approve", adminVerificationController.approveVerification);
router.post("/verifications/:userId/reject", adminVerificationController.rejectVerification);
router.post("/verifications/:userId/request-resubmission", adminVerificationController.requestResubmission);

router.get("/users", adminUserController.listUsers);
router.get("/users/:id", adminUserController.getUser);
router.post("/users/:id/suspend", validate(adminValidators.moderationReason), adminUserController.suspendUser);
router.post("/users/:id/reactivate", adminUserController.reactivateUser);
router.patch("/users/:id/role", validate(adminValidators.changeRole), adminUserController.changeRole);
router.delete("/users/:id", adminUserController.deleteUser);

router.post(
  "/content/:type/:id/moderate",
  validate(adminValidators.moderateContent),
  adminModerationController.moderate
);

router.get("/startups", adminStartupController.listStartups);
router.post("/startups/:id/suspend", validate(adminValidators.moderationReason), adminStartupController.suspendStartup);
router.post("/startups/:id/restore", adminStartupController.restoreStartup);

router.get("/activity-logs", adminActivityController.listActivityLogs);

module.exports = router;
