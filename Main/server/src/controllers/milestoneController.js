const milestoneService = require("../services/milestoneService");
const ApiError = require("../utils/ApiError");

async function createMilestone(req, res) {
  try {
    const milestone = await milestoneService.createMilestone(
      {
        projectId: req.body.projectId,
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getMilestone(req, res) {
  try {
    const milestone = await milestoneService.getMilestoneById(req.params.id);
    await milestoneService.assertMilestoneViewAccess(milestone, req.user.id);
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listMilestones(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.projectId) {
      filter.project = req.query.projectId;
    }
    const milestones = await milestoneService.listMilestonesForUser(
      req.user.id,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: milestones });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateMilestone(req, res) {
  try {
    const milestone = await milestoneService.updateMilestone(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveMilestone(req, res) {
  try {
    const milestone = await milestoneService.archiveMilestone(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createMilestone,
  getMilestone,
  listMilestones,
  updateMilestone,
  archiveMilestone,
};
