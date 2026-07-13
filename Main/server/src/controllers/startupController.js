const startupService = require("../services/startupService");

async function createStartup(req, res) {
  try {
    const startup = await startupService.createStartup(req.body);
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

async function updateStartup(req, res) {
  try {
    const startup = await startupService.updateStartup(req.params.id, req.body);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteStartup(req, res) {
  try {
    const startup = await startupService.deleteStartup(req.params.id);
    return res.status(200).json({ success: true, data: startup });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
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
  updateStartup,
  deleteStartup,
  listStartups,
};
