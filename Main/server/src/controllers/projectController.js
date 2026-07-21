const projectService = require("../services/projectService");
const ApiError = require("../utils/ApiError");

async function createProject(req, res) {
  try {
    const project = await projectService.createProject(
      {
        workspaceId: req.body.workspaceId,
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getProject(req, res) {
  try {
    const project = await projectService.getProjectById(req.params.id);
    await projectService.assertProjectViewAccess(project, req.user.id);
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listProjects(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.workspaceId) {
      filter.workspace = req.query.workspaceId;
    }
    const projects = await projectService.listProjectsForUser(
      req.user.id,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: projects });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateProject(req, res) {
  try {
    const project = await projectService.updateProject(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveProject(req, res) {
  try {
    const project = await projectService.archiveProject(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createProject,
  getProject,
  listProjects,
  updateProject,
  archiveProject,
};
