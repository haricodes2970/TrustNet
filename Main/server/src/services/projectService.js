const Project = require("../models/Project");
const Workspace = require("../models/Workspace");
const ApiError = require("../utils/ApiError");
const workspaceService = require("./workspaceService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Project.owner records who created the project (audit only) and is never
// consulted for authorization. All permission decisions come exclusively
// from workspaceService.resolveWorkspaceAccess() against the parent Workspace.

async function assertWorkspaceWriteAccess(workspaceId, userId, { isAdmin = false } = {}) {
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) {
    throw new ApiError(404, "Workspace not found.");
  }
  if (workspace.isArchived) {
    throw new ApiError(409, "This workspace is archived and cannot accept new or updated projects.");
  }

  if (!isAdmin) {
    const access = await workspaceService.resolveWorkspaceAccess(workspaceId, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to manage projects in this workspace.");
    }
  }

  return workspace;
}

// Case-insensitive, per-workspace, active-projects-only - an archived
// project's name is free to reuse (matches Startup's per-founder guard
// from the Startup phase: this prevents accidental duplicate/spam
// submissions, not legitimate reuse of a retired name).
async function assertNoDuplicateName(workspaceId, name, excludeProjectId) {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {
    workspace: workspaceId,
    isArchived: false,
    name: new RegExp(`^${escaped}$`, "i"),
  };
  if (excludeProjectId) {
    query._id = { $ne: excludeProjectId };
  }
  const existing = await Project.findOne(query).lean();
  if (existing) {
    throw new ApiError(409, "A project with this name already exists in this workspace.");
  }
}

async function createProject({ workspaceId, name, description, status }, userId, { isAdmin = false } = {}) {
  try {
    await assertWorkspaceWriteAccess(workspaceId, userId, { isAdmin });
    await assertNoDuplicateName(workspaceId, name);

    const project = await Project.create({
      workspace: workspaceId,
      name,
      description: description || "",
      status: status || undefined,
      owner: userId,
    });

    return project.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create project.");
  }
}

async function getProjectById(id) {
  try {
    const project = await Project.findById(id).lean();
    if (!project) {
      throw new ApiError(404, "Project not found.");
    }
    return project;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch project.");
  }
}

async function assertProjectViewAccess(project, userId, { isAdmin = false } = {}) {
  if (isAdmin) {
    return { role: "admin" };
  }
  const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
  if (!access.role) {
    throw new ApiError(403, "You are not authorized to view this project.");
  }
  return access;
}

// isArchived defaults to excluded (override-friendly, same pattern as
// Post/Community/Job/Startup's listing defaults) so an archived project
// stops showing up in the default view. `search` does a case-insensitive
// name/description match, same shape as adminUserService's search.
async function listProjectsForUser(userId, filter = {}, options = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { isArchived: false, ...rest };

    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      base.$or = [{ name: regex }, { description: regex }];
    }

    if (base.workspace) {
      // A specific workspace was requested — verify access rather than trusting the caller's filter.
      const access = await workspaceService.resolveWorkspaceAccess(base.workspace, userId);
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to view projects in this workspace.");
      }
    } else {
      const workspaces = await workspaceService.listWorkspacesForUser(userId, {}, {});
      base.workspace = { $in: workspaces.map((workspace) => workspace._id) };
    }

    const query = Project.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list projects.");
  }
}

async function updateProject(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getProjectById(id);
    await assertWorkspaceWriteAccess(existing.workspace, userId, { isAdmin });
    if (existing.isArchived) {
      throw new ApiError(409, "This project is archived. Restore it before making changes.");
    }
    if (updateData.name && updateData.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      await assertNoDuplicateName(existing.workspace, updateData.name, id);
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.workspace;
    delete safeUpdate.owner;
    delete safeUpdate.isArchived;
    safeUpdate.updatedBy = userId;

    const project = await Project.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!project) {
      throw new ApiError(404, "Project not found.");
    }

    return project;
  } catch (error) {
    throw handleServiceError(error, "Failed to update project.");
  }
}

async function archiveProject(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getProjectById(id);
    await assertWorkspaceWriteAccess(existing.workspace, userId, { isAdmin });

    const project = await Project.findByIdAndUpdate(
      id,
      { isArchived: true, updatedBy: userId },
      { new: true }
    ).lean();

    if (!project) {
      throw new ApiError(404, "Project not found.");
    }

    return project;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive project.");
  }
}

async function restoreProject(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getProjectById(id);
    await assertWorkspaceWriteAccess(existing.workspace, userId, { isAdmin });

    const project = await Project.findByIdAndUpdate(
      id,
      { isArchived: false, updatedBy: userId },
      { new: true }
    ).lean();

    if (!project) {
      throw new ApiError(404, "Project not found.");
    }

    return project;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore project.");
  }
}

module.exports = {
  createProject,
  getProjectById,
  assertProjectViewAccess,
  listProjectsForUser,
  updateProject,
  archiveProject,
  restoreProject,
};
