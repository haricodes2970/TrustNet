const milestoneService = require("../services/milestoneService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

function isPlatformAdmin(req) {
  return req.user.role === "admin";
}

function statusOf(error, fallback = 400) {
  return error instanceof ApiError ? error.statusCode : fallback;
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Milestone", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createMilestone(req, res) {
  try {
    const milestone = await milestoneService.createMilestone(
      {
        projectId: req.body.projectId,
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
      },
      req.user.id,
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "milestone.create", milestone._id, { projectId: req.body.projectId, title: milestone.title });
    return res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function getMilestone(req, res) {
  try {
    const milestone = await milestoneService.getMilestoneById(req.params.id);
    await milestoneService.assertMilestoneViewAccess(milestone, req.user.id, { isAdmin: isPlatformAdmin(req) });
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    return res.status(statusOf(error, 404)).json({ success: false, message: error.message });
  }
}

async function listMilestones(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.projectId) {
      filter.project = req.query.projectId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      filter.search = req.query.search;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const milestones = await milestoneService.listMilestonesForUser(req.user.id, filter, options);
    return res.status(200).json({ success: true, data: milestones });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateMilestone(req, res) {
  try {
    const milestone = await milestoneService.updateMilestone(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "milestone.update", milestone._id, { fields: Object.keys(req.body) });
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function archiveMilestone(req, res) {
  try {
    const milestone = await milestoneService.archiveMilestone(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "milestone.archive", milestone._id, {});
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function restoreMilestone(req, res) {
  try {
    const milestone = await milestoneService.restoreMilestone(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "milestone.restore", milestone._id, {});
    return res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createMilestone,
  getMilestone,
  listMilestones,
  updateMilestone,
  archiveMilestone,
  restoreMilestone,
};
