const userService = require("../services/userService");
const adminUserService = require("../services/adminUserService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

function logAdminAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "User", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

function statusOf(error) {
  if (error instanceof ApiError) {
    return error.statusCode;
  }
  return /not found/i.test(error.message) ? 404 : 400;
}

async function listUsers(req, res) {
  try {
    const result = await adminUserService.listUsers(req.query);
    return res.status(200).json({ success: true, data: result.users, meta: { total: result.total, limit: result.limit, skip: result.skip } });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function getUser(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function suspendUser(req, res) {
  try {
    const reason = req.body ? req.body.reason : undefined;
    const user = await adminUserService.suspendUser(req.user.id, req.params.id, reason);
    logAdminAction(req, "user.suspend", req.params.id, { reason: reason || null });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function reactivateUser(req, res) {
  try {
    const user = await adminUserService.reactivateUser(req.params.id);
    logAdminAction(req, "user.reactivate", req.params.id, {});
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function changeRole(req, res) {
  try {
    const { role } = req.body;
    const user = await adminUserService.changeRole(req.user.id, req.params.id, role);
    logAdminAction(req, "user.change_role", req.params.id, { role });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const user = await adminUserService.softDeleteUser(req.user.id, req.params.id);
    logAdminAction(req, "user.soft_delete", req.params.id, {});
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = { listUsers, getUser, suspendUser, reactivateUser, changeRole, deleteUser };
