const Milestone = require("../models/Milestone");
const ApiError = require("../utils/ApiError");
const projectService = require("./projectService");
const workspaceService = require("./workspaceService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Milestones are structural planning entities, like Projects — owner/admin
// manage them, contributors are read-only. Contributors participate through
// Tasks, not Milestones. Permission source of truth stays exclusively
// workspaceService.resolveWorkspaceAccess(), reached via the parent Project
// (projectService.getProjectById), same foundation-reuse chain Task uses.

async function assertMilestoneWriteAccess(projectId, userId, { isAdmin = false } = {}) {
  const project = await projectService.getProjectById(projectId);
  if (!isAdmin) {
    const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new ApiError(403, "You are not authorized to manage milestones in this project.");
    }
  }
  return project;
}

// Case-insensitive, per-project, active-milestones-only - mirrors Project's
// per-workspace guard exactly (same "structural planning entity" reasoning
// from the header comment above).
async function assertNoDuplicateName(projectId, title, excludeMilestoneId) {
  const escaped = title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {
    project: projectId,
    isArchived: false,
    title: new RegExp(`^${escaped}$`, "i"),
  };
  if (excludeMilestoneId) {
    query._id = { $ne: excludeMilestoneId };
  }
  const existing = await Milestone.findOne(query).lean();
  if (existing) {
    throw new ApiError(409, "A milestone with this title already exists in this project.");
  }
}

async function createMilestone({ projectId, title, description, dueDate }, userId, { isAdmin = false } = {}) {
  try {
    const project = await assertMilestoneWriteAccess(projectId, userId, { isAdmin });
    if (project.isArchived) {
      throw new ApiError(409, "This project is archived and cannot accept new milestones.");
    }
    await assertNoDuplicateName(projectId, title);

    const milestone = await Milestone.create({
      project: projectId,
      title,
      description: description || "",
      dueDate: dueDate || undefined,
      createdBy: userId,
    });

    return milestone.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create milestone.");
  }
}

async function getMilestoneById(id) {
  try {
    const milestone = await Milestone.findById(id).lean();
    if (!milestone) {
      throw new ApiError(404, "Milestone not found.");
    }
    return milestone;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch milestone.");
  }
}

async function assertMilestoneViewAccess(milestone, userId, { isAdmin = false } = {}) {
  if (isAdmin) {
    return { role: "admin" };
  }
  const project = await projectService.getProjectById(milestone.project);
  const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
  if (!access.role) {
    throw new ApiError(403, "You are not authorized to view this milestone.");
  }
  return access;
}

// isArchived defaults to excluded (override-friendly, same pattern as
// Project/Task's listing defaults). `search` does a case-insensitive
// title/description match, same shape as Project/Task's.
async function listMilestonesForUser(userId, filter = {}, options = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { isArchived: false, ...rest };

    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      base.$or = [{ title: regex }, { description: regex }];
    }

    if (base.project) {
      const project = await projectService.getProjectById(base.project);
      const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to view milestones in this project.");
      }
    } else {
      const projects = await projectService.listProjectsForUser(userId, {}, {});
      base.project = { $in: projects.map((project) => project._id) };
    }

    const query = Milestone.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list milestones.");
  }
}

async function updateMilestone(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getMilestoneById(id);
    const project = await assertMilestoneWriteAccess(existing.project, userId, { isAdmin });

    if (existing.isArchived) {
      throw new ApiError(409, "This milestone is archived. Restore it before making changes.");
    }
    if (project.isArchived) {
      throw new ApiError(409, "This project is archived. Restore it before updating its milestones.");
    }
    if (updateData.title && updateData.title.trim().toLowerCase() !== existing.title.toLowerCase()) {
      await assertNoDuplicateName(existing.project, updateData.title, id);
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.project;
    delete safeUpdate.createdBy;
    delete safeUpdate.isArchived;

    // status="archived" and the isArchived flag are two views of the same
    // lifecycle state - same drift risk fixed for Task in the previous
    // phase (status="archived" set via plain update, independent of the
    // isArchived flag the dedicated archive endpoint sets).
    if (safeUpdate.status === "archived") {
      safeUpdate.isArchived = true;
    }

    safeUpdate.updatedBy = userId;

    const milestone = await Milestone.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!milestone) {
      throw new ApiError(404, "Milestone not found.");
    }

    return milestone;
  } catch (error) {
    throw handleServiceError(error, "Failed to update milestone.");
  }
}

async function archiveMilestone(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getMilestoneById(id);
    await assertMilestoneWriteAccess(existing.project, userId, { isAdmin });

    const milestone = await Milestone.findByIdAndUpdate(
      id,
      { isArchived: true, status: "archived", updatedBy: userId },
      { new: true }
    ).lean();

    if (!milestone) {
      throw new ApiError(404, "Milestone not found.");
    }

    return milestone;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive milestone.");
  }
}

async function restoreMilestone(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getMilestoneById(id);
    const project = await assertMilestoneWriteAccess(existing.project, userId, { isAdmin });

    if (project.isArchived) {
      throw new ApiError(409, "Restore the parent project before restoring its milestones.");
    }

    const milestone = await Milestone.findByIdAndUpdate(
      id,
      { isArchived: false, status: "planned", updatedBy: userId },
      { new: true }
    ).lean();

    if (!milestone) {
      throw new ApiError(404, "Milestone not found.");
    }

    return milestone;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore milestone.");
  }
}

module.exports = {
  createMilestone,
  getMilestoneById,
  assertMilestoneViewAccess,
  listMilestonesForUser,
  updateMilestone,
  archiveMilestone,
  restoreMilestone,
};
