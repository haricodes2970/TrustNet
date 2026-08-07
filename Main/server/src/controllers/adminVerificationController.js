const adminVerificationService = require("../services/adminVerificationService");
const auditLogService = require("../services/auditLogService");

function logAdminAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "User", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function getMe(req, res) {
  try {
    return res.status(200).json({
      success: true,
      data: { id: req.user.id, email: req.user.email, role: req.user.role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listVerifications(req, res) {
  try {
    const options = {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
    };
    const users = await adminVerificationService.listPendingVerifications(options);
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getVerification(req, res) {
  try {
    const user = await adminVerificationService.getVerification(req.params.userId);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function approveVerification(req, res) {
  try {
    const user = await adminVerificationService.approveVerification(req.params.userId);
    logAdminAction(req, "verification.approve", req.params.userId, {});
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function rejectVerification(req, res) {
  try {
    const reason = req.body ? req.body.reason : undefined;
    const user = await adminVerificationService.rejectVerification(req.params.userId, reason);
    logAdminAction(req, "verification.reject", req.params.userId, { reason: reason || null });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function requestResubmission(req, res) {
  try {
    const reason = req.body ? req.body.reason : undefined;
    const user = await adminVerificationService.requestResubmission(req.params.userId, reason);
    logAdminAction(req, "verification.request_resubmission", req.params.userId, { reason: reason || null });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

module.exports = {
  getMe,
  listVerifications,
  getVerification,
  approveVerification,
  rejectVerification,
  requestResubmission,
};
