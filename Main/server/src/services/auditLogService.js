const AuditLog = require("../models/AuditLog");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Fire-and-record: every admin mutation calls this after its own service
// call succeeds. Failure to write the log must never fail the admin action
// itself (the action already happened), so callers should not let a
// rejected promise here bubble into their response — log and continue.
async function createLog({ actor, action, targetType, targetId, details, ip }) {
  try {
    return await AuditLog.create({ actor, action, targetType, targetId, details, ip });
  } catch (error) {
    throw handleServiceError(error, "Failed to write audit log.");
  }
}

async function listLogs(filter = {}, options = {}) {
  try {
    const query = AuditLog.find(normalizeFilter(filter)).populate("actor", "fullName email role");
    return applyQueryOptions(query, { sort: { createdAt: -1 }, ...options }).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list audit logs.");
  }
}

async function countLogs(filter = {}) {
  try {
    return await AuditLog.countDocuments(normalizeFilter(filter));
  } catch (error) {
    throw handleServiceError(error, "Failed to count audit logs.");
  }
}

module.exports = { createLog, listLogs, countLogs };
