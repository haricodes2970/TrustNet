const workspaceService = require("../services/workspaceService");
const ApiError = require("../utils/ApiError");

async function createWorkspace(req, res) {
  try {
    const workspace = await workspaceService.createWorkspace(
      {
        startupId: req.body.startupId,
        name: req.body.name,
        description: req.body.description,
        settings: req.body.settings,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getWorkspace(req, res) {
  try {
    const access = await workspaceService.resolveWorkspaceAccess(req.params.id, req.user.id);
    if (!access.role) {
      throw new ApiError(403, "You are not authorized to view this workspace.");
    }
    const workspace = await workspaceService.getWorkspaceById(req.params.id);
    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listWorkspaces(req, res) {
  try {
    const workspaces = await workspaceService.listWorkspacesForUser(
      req.user.id,
      req.query.filter || {},
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateWorkspace(req, res) {
  try {
    const workspace = await workspaceService.updateWorkspace(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveWorkspace(req, res) {
  try {
    const workspace = await workspaceService.archiveWorkspace(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listMembers(req, res) {
  try {
    const members = await workspaceService.listWorkspaceMembers(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
  archiveWorkspace,
  listMembers,
};
