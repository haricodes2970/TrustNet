const Task = require("../models/Task");
const ApiError = require("../utils/ApiError");
const projectService = require("./projectService");
const workspaceService = require("./workspaceService");
const milestoneService = require("./milestoneService");
const { applyQueryOptions, handleServiceError, normalizeFilter, canMutateTask } = require("./serviceUtils");

// Task stores only `project` — no denormalized workspace reference (explicit
// decision: avoid duplicated relationships until performance data proves the
// need). The parent Workspace is resolved through Project on every access
// check, via projectService.getProjectById(). All authorization still comes
// exclusively from workspaceService.resolveWorkspaceAccess(); canMutateTask()
// (serviceUtils.js) is a second, orthogonal check on top, not a duplicate of
// workspace-role resolution.

async function resolveTaskAccess(projectId, userId) {
  const project = await projectService.getProjectById(projectId);
  const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
  return { project, access };
}

async function assertAssigneeAllowed(workspaceId, workspaceRole, assignedTo, userId) {
  if (!assignedTo) {
    return;
  }

  if (workspaceRole === "contributor" && String(assignedTo) !== String(userId)) {
    throw new ApiError(403, "Contributors may only assign tasks to themselves.");
  }

  const members = await workspaceService.listWorkspaceMembers(workspaceId, userId);
  const isMember = members.some((member) => member.user && String(member.user) === String(assignedTo));
  if (!isMember) {
    throw new ApiError(400, "assignedTo must be an active member of this task's workspace.");
  }
}

// Relationship-integrity check on the Task side only — does not touch
// Milestone module internals (out of this phase's scope; Milestone gets
// its own hardening pass next). A milestone that belongs to a different
// project, or has been archived, is not a valid link target.
async function assertMilestoneBelongsToProject(milestoneId, projectId) {
  if (!milestoneId) {
    return;
  }
  const milestone = await milestoneService.getMilestoneById(milestoneId);
  if (String(milestone.project) !== String(projectId)) {
    throw new ApiError(400, "This milestone does not belong to the task's project.");
  }
  if (milestone.isArchived) {
    throw new ApiError(409, "Cannot link a task to an archived milestone.");
  }
}

async function createTask({ projectId, title, description, priority, dueDate, assignedTo }, userId, { isAdmin = false } = {}) {
  try {
    const { project, access } = await resolveTaskAccess(projectId, userId);

    if (!access.role && !isAdmin) {
      throw new ApiError(403, "You are not authorized to create tasks in this project.");
    }
    if (project.isArchived) {
      throw new ApiError(409, "This project is archived and cannot accept new tasks.");
    }

    await assertAssigneeAllowed(project.workspace, access.role, assignedTo, userId);

    const task = await Task.create({
      project: projectId,
      title,
      description: description || "",
      priority: priority || undefined,
      dueDate: dueDate || undefined,
      assignedTo: assignedTo || null,
      createdBy: userId,
    });

    return task.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create task.");
  }
}

async function getTaskById(id) {
  try {
    const task = await Task.findById(id).lean();
    if (!task) {
      throw new ApiError(404, "Task not found.");
    }
    return task;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch task.");
  }
}

async function assertTaskViewAccess(task, userId, { isAdmin = false } = {}) {
  if (isAdmin) {
    return { role: "admin" };
  }
  const { access } = await resolveTaskAccess(task.project, userId);
  if (!access.role) {
    throw new ApiError(403, "You are not authorized to view this task.");
  }
  return access;
}

// isArchived defaults to excluded (override-friendly, same pattern as
// Project/Post/Community/Job/Startup's listing defaults). `search` does a
// case-insensitive title/description match, same shape as Project's.
async function listTasksForUser(userId, filter = {}, options = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { isArchived: false, ...rest };

    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      base.$or = [{ title: regex }, { description: regex }];
    }

    if (base.project) {
      // A specific project was requested — verify access rather than trusting the caller's filter.
      const { access } = await resolveTaskAccess(base.project, userId);
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to view tasks in this project.");
      }
    } else {
      const projects = await projectService.listProjectsForUser(userId, {}, {});
      base.project = { $in: projects.map((project) => project._id) };
    }

    const query = Task.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list tasks.");
  }
}

async function updateTask(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getTaskById(id);
    const { project, access } = await resolveTaskAccess(existing.project, userId);

    if (!isAdmin) {
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to update this task.");
      }
      if (!canMutateTask(existing, userId, access.role)) {
        throw new ApiError(403, "You are not authorized to update this task.");
      }
    }
    if (existing.isArchived) {
      throw new ApiError(409, "This task is archived. Restore it before making changes.");
    }
    if (project.isArchived) {
      throw new ApiError(409, "This project is archived. Restore it before updating its tasks.");
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.project;
    delete safeUpdate.createdBy;
    delete safeUpdate.isArchived;

    if (Object.prototype.hasOwnProperty.call(safeUpdate, "assignedTo")) {
      await assertAssigneeAllowed(project.workspace, access.role, safeUpdate.assignedTo, userId);
    }

    if (Object.prototype.hasOwnProperty.call(safeUpdate, "milestone")) {
      await assertMilestoneBelongsToProject(safeUpdate.milestone, existing.project);
    }

    // status="archived" and the isArchived flag are two views of the same
    // lifecycle state - without this, a plain PUT {status:"archived"} left
    // isArchived false, so the task stayed fully editable and still showed
    // up in the default (isArchived:false) list, silently out of sync with
    // a task archived via the dedicated DELETE endpoint.
    if (safeUpdate.status === "archived") {
      safeUpdate.isArchived = true;
    }

    safeUpdate.updatedBy = userId;

    const task = await Task.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!task) {
      throw new ApiError(404, "Task not found.");
    }

    return task;
  } catch (error) {
    throw handleServiceError(error, "Failed to update task.");
  }
}

async function archiveTask(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getTaskById(id);
    const { access } = await resolveTaskAccess(existing.project, userId);

    if (!isAdmin) {
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to archive this task.");
      }
      if (!canMutateTask(existing, userId, access.role)) {
        throw new ApiError(403, "You are not authorized to archive this task.");
      }
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { isArchived: true, status: "archived", updatedBy: userId },
      { new: true }
    ).lean();

    if (!task) {
      throw new ApiError(404, "Task not found.");
    }

    return task;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive task.");
  }
}

async function restoreTask(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getTaskById(id);
    const { project, access } = await resolveTaskAccess(existing.project, userId);

    if (!isAdmin) {
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to restore this task.");
      }
      if (!canMutateTask(existing, userId, access.role)) {
        throw new ApiError(403, "You are not authorized to restore this task.");
      }
    }
    if (project.isArchived) {
      throw new ApiError(409, "Restore the parent project before restoring its tasks.");
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { isArchived: false, status: "todo", updatedBy: userId },
      { new: true }
    ).lean();

    if (!task) {
      throw new ApiError(404, "Task not found.");
    }

    return task;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore task.");
  }
}

module.exports = {
  createTask,
  getTaskById,
  assertTaskViewAccess,
  listTasksForUser,
  updateTask,
  archiveTask,
  restoreTask,
};
