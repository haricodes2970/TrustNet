const startupService = require("../services/startupService");
const ApiError = require("../utils/ApiError");
const auditLogService = require("../services/auditLogService");

// Owner OR platform admin. Mirrors assertOwner's ApiError(403) shape, but
// admin's role (populated by `authorize()` on these routes purely to read
// req.user.role, same trick as the Admin Dashboard phase) always passes.
function assertOwnerOrAdmin(founderId, req, message) {
  const isOwner = String(founderId) === String(req.user.id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, message);
  }
}

// Startup mutations are logged the same way admin actions are (see
// adminUserController.js etc. from the Admin Dashboard phase) - reusing
// auditLogService rather than building a second logging path. A failure
// to write the log must never fail the mutation itself.
function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Startup", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createStartup(req, res) {
  try {
    // Ignore any founder sent by the client; assign the authenticated user.
    const data = { ...req.body, founder: req.user.id };
    const startup = await startupService.createStartup(data);
    logAction(req, "startup.create", startup._id, { name: startup.name, slug: startup.slug });
    return res.status(201).json({ success: true, data: startup });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getStartup(req, res) {
  try {
    const startup = await startupService.getStartupById(req.params.id);
    startupService.assertStartupViewAccess(startup, req.user);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    return res.status(404).json({ success: false, message: "Startup not found." });
  }
}

async function getStartupBySlug(req, res) {
  try {
    const startup = await startupService.getStartupBySlug(req.params.slug);
    startupService.assertStartupViewAccess(startup, req.user);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    return res.status(404).json({ success: false, message: "Startup not found." });
  }
}

async function getMyStartups(req, res) {
  try {
    const startups = await startupService.listMyStartups(req.user.id);
    return res.status(200).json({ success: true, data: startups });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateStartup(req, res) {
  try {
    const existing = await startupService.getStartupById(req.params.id);
    assertOwnerOrAdmin(existing.founder, req, "You are not authorized to update this startup.");
    if (existing.deletedAt) {
      throw new ApiError(409, "This startup has been deleted. Restore it before making changes.");
    }
    const startup = await startupService.updateStartup(req.params.id, { ...req.body, updatedBy: req.user.id });
    logAction(req, "startup.update", startup._id, { fields: Object.keys(req.body) });
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deleteStartup(req, res) {
  try {
    const existing = await startupService.getStartupById(req.params.id);
    assertOwnerOrAdmin(existing.founder, req, "You are not authorized to delete this startup.");
    const startup = await startupService.deleteStartup(req.params.id);
    logAction(req, "startup.delete", startup._id, {});
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreStartup(req, res) {
  try {
    const existing = await startupService.getStartupById(req.params.id);
    assertOwnerOrAdmin(existing.founder, req, "You are not authorized to restore this startup.");
    const startup = await startupService.restoreStartup(req.params.id);
    logAction(req, "startup.restore", startup._id, {});
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listStartups(req, res) {
  try {
    const startups = await startupService.listStartups(req.query.filter || {}, req.query.options || {});
    return res.status(200).json({ success: true, data: startups });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createStartup,
  getStartup,
  getStartupBySlug,
  getMyStartups,
  updateStartup,
  deleteStartup,
  restoreStartup,
  listStartups,
};
