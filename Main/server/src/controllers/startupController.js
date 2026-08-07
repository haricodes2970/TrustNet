const startupService = require("../services/startupService");
const ApiError = require("../utils/ApiError");
const { assertOwner } = require("../services/serviceUtils");

async function createStartup(req, res) {
  try {
    // Ignore any founder sent by the client; assign the authenticated user.
    const data = { ...req.body, founder: req.user.id };
    const startup = await startupService.createStartup(data);
    return res.status(201).json({ success: true, data: startup });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getStartup(req, res) {
  try {
    const startup = await startupService.getStartupById(req.params.id);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function getStartupBySlug(req, res) {
  try {
    const startup = await startupService.getStartupBySlug(req.params.slug);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
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
    assertOwner(existing.founder, req.user.id, "You are not authorized to update this startup.", 403);
    if (existing.deletedAt) {
      throw new ApiError(409, "This startup has been deleted. Restore it before making changes.");
    }
    const startup = await startupService.updateStartup(req.params.id, req.body);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deleteStartup(req, res) {
  try {
    const existing = await startupService.getStartupById(req.params.id);
    assertOwner(existing.founder, req.user.id, "You are not authorized to delete this startup.", 403);
    const startup = await startupService.deleteStartup(req.params.id);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreStartup(req, res) {
  try {
    const existing = await startupService.getStartupById(req.params.id);
    assertOwner(existing.founder, req.user.id, "You are not authorized to restore this startup.", 403);
    const startup = await startupService.restoreStartup(req.params.id);
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
