const startupService = require("./startupService");
const { handleServiceError } = require("./serviceUtils");

// startupService.updateStartup is a raw findByIdAndUpdate with no ownership
// check baked in (ownership is enforced in startupController, not the
// service) - safe to reuse directly for admin writes.
async function suspendStartup(actorId, startupId, reason) {
  try {
    return await startupService.updateStartup(startupId, {
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedBy: actorId,
      suspensionReason: reason || null,
    });
  } catch (error) {
    throw handleServiceError(error, "Failed to suspend startup.");
  }
}

async function restoreStartup(startupId) {
  try {
    return await startupService.updateStartup(startupId, {
      isSuspended: false,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
    });
  } catch (error) {
    throw handleServiceError(error, "Failed to restore startup.");
  }
}

module.exports = { suspendStartup, restoreStartup };
