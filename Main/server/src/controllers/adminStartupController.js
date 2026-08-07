const startupService = require("../services/startupService");
const adminStartupService = require("../services/adminStartupService");
const auditLogService = require("../services/auditLogService");

function logAdminAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Startup", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function listStartups(req, res) {
  try {
    const startups = await startupService.listStartups(req.query.filter || {}, req.query.options || {});
    return res.status(200).json({ success: true, data: startups });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function suspendStartup(req, res) {
  try {
    const reason = req.body ? req.body.reason : undefined;
    const startup = await adminStartupService.suspendStartup(req.user.id, req.params.id, reason);
    logAdminAction(req, "startup.suspend", req.params.id, { reason: reason || null });
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    const status = /not found/i.test(error.message) ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreStartup(req, res) {
  try {
    const startup = await adminStartupService.restoreStartup(req.params.id);
    logAdminAction(req, "startup.restore", req.params.id, {});
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    const status = /not found/i.test(error.message) ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = { listStartups, suspendStartup, restoreStartup };
