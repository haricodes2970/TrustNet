const Project = require("../models/Project");
const Workspace = require("../models/Workspace");
const workspaceService = require("./workspaceService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Project.owner records who created the project (audit only) and is never
// consulted for authorization. All permission decisions come exclusively
// from workspaceService.resolveWorkspaceAccess() against the parent Workspace.

async function assertWorkspaceWriteAccess(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) {
    throw new Error("Workspace not found.");
  }
  if (workspace.isArchived) {
    throw new Error("This workspace is archived and cannot accept new or updated projects.");
  }

  const access = await workspaceService.resolveWorkspaceAccess(workspaceId, userId);
  if (access.role !== "owner" && access.role !== "admin") {
    throw new Error("You are not authorized to manage projects in this workspace.");
  }

  return workspace;
}

async function createProject({ workspaceId, name, description, status }, userId) {
  try {
    await assertWorkspaceWriteAccess(workspaceId, userId);

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
      throw new Error("Project not found.");
    }
    return project;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch project.");
  }
}

async function assertProjectViewAccess(project, userId) {
  const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
  if (!access.role) {
    throw new Error("You are not authorized to view this project.");
  }
  return access;
}

async function listProjectsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);

    if (base.workspace) {
      // A specific workspace was requested — verify access rather than trusting the caller's filter.
      const access = await workspaceService.resolveWorkspaceAccess(base.workspace, userId);
      if (!access.role) {
        throw new Error("You are not authorized to view projects in this workspace.");
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

async function updateProject(id, userId, updateData) {
  try {
    const existing = await getProjectById(id);
    await assertWorkspaceWriteAccess(existing.workspace, userId);

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
      throw new Error("Project not found.");
    }

    return project;
  } catch (error) {
    throw handleServiceError(error, "Failed to update project.");
  }
}

async function archiveProject(id, userId) {
  try {
    const existing = await getProjectById(id);
    await assertWorkspaceWriteAccess(existing.workspace, userId);

    const project = await Project.findByIdAndUpdate(
      id,
      { isArchived: true, updatedBy: userId },
      { new: true }
    ).lean();

    if (!project) {
      throw new Error("Project not found.");
    }

    return project;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive project.");
  }
}

module.exports = {
  createProject,
  getProjectById,
  assertProjectViewAccess,
  listProjectsForUser,
  updateProject,
  archiveProject,
};
