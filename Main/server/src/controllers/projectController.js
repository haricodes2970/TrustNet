const projectService = require("../services/projectService");
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
    .createLog({ actor: req.user.id, action, targetType: "Project", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createProject(req, res) {
  try {
    const project = await projectService.createProject(
      {
        workspaceId: req.body.workspaceId,
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
      },
      req.user.id,
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "project.create", project._id, { workspaceId: req.body.workspaceId, name: project.name });
    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function getProject(req, res) {
  try {
    const project = await projectService.getProjectById(req.params.id);
    await projectService.assertProjectViewAccess(project, req.user.id, { isAdmin: isPlatformAdmin(req) });
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    return res.status(statusOf(error, 404)).json({ success: false, message: error.message });
  }
}

async function listProjects(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.workspaceId) {
      filter.workspace = req.query.workspaceId;
    }
    if (req.query.search) {
      filter.search = req.query.search;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const projects = await projectService.listProjectsForUser(req.user.id, filter, options);
    return res.status(200).json({ success: true, data: projects });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateProject(req, res) {
  try {
    const project = await projectService.updateProject(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "project.update", project._id, { fields: Object.keys(req.body) });
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function archiveProject(req, res) {
  try {
    const project = await projectService.archiveProject(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "project.archive", project._id, {});
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function restoreProject(req, res) {
  try {
    const project = await projectService.restoreProject(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "project.restore", project._id, {});
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createProject,
  getProject,
  listProjects,
  updateProject,
  archiveProject,
  restoreProject,
};
