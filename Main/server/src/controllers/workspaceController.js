const workspaceService = require("../services/workspaceService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

function isPlatformAdmin(req) {
  return req.user.role === "admin";
}

function statusOf(error) {
  return error instanceof ApiError ? error.statusCode : 404;
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Workspace", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createWorkspace(req, res) {
  try {
    const workspace = await workspaceService.createWorkspace(
      {
        startupId: req.body.startupId,
        name: req.body.name,
        description: req.body.description,
        settings: req.body.settings,
      },
      req.user.id,
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "workspace.create", workspace._id, { startupId: req.body.startupId });
    return res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getWorkspace(req, res) {
  try {
    const workspace = await workspaceService.getWorkspaceById(req.params.id);
    if (!isPlatformAdmin(req)) {
      const access = await workspaceService.resolveWorkspaceAccess(req.params.id, req.user.id);
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to view this workspace.");
      }
    }
    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
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
    const workspace = await workspaceService.updateWorkspace(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "workspace.update", workspace._id, { fields: Object.keys(req.body) });
    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveWorkspace(req, res) {
  try {
    const workspace = await workspaceService.archiveWorkspace(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "workspace.archive", workspace._id, {});
    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function restoreWorkspace(req, res) {
  try {
    const workspace = await workspaceService.restoreWorkspace(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "workspace.restore", workspace._id, {});
    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function listMembers(req, res) {
  try {
    const members = await workspaceService.listWorkspaceMembers(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
  archiveWorkspace,
  restoreWorkspace,
  listMembers,
};
