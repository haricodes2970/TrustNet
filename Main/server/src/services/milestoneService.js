const Milestone = require("../models/Milestone");
const projectService = require("./projectService");
const workspaceService = require("./workspaceService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Milestones are structural planning entities, like Projects — owner/admin
// manage them, contributors are read-only. Contributors participate through
// Tasks, not Milestones. Permission source of truth stays exclusively
// workspaceService.resolveWorkspaceAccess(), reached via the parent Project
// (projectService.getProjectById), same foundation-reuse chain Task uses.

async function assertMilestoneWriteAccess(projectId, userId) {
  const project = await projectService.getProjectById(projectId);
  const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
  if (access.role !== "owner" && access.role !== "admin") {
    throw new Error("You are not authorized to manage milestones in this project.");
  }
  return project;
}

async function createMilestone({ projectId, title, description, dueDate }, userId) {
  try {
    const project = await assertMilestoneWriteAccess(projectId, userId);
    if (project.isArchived) {
      throw new Error("This project is archived and cannot accept new milestones.");
    }

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
      throw new Error("Milestone not found.");
    }
    return milestone;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch milestone.");
  }
}

async function assertMilestoneViewAccess(milestone, userId) {
  const project = await projectService.getProjectById(milestone.project);
  const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
  if (!access.role) {
    throw new Error("You are not authorized to view this milestone.");
  }
  return access;
}

async function listMilestonesForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);

    if (base.project) {
      const project = await projectService.getProjectById(base.project);
      const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
      if (!access.role) {
        throw new Error("You are not authorized to view milestones in this project.");
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

async function updateMilestone(id, userId, updateData) {
  try {
    const existing = await getMilestoneById(id);
    await assertMilestoneWriteAccess(existing.project, userId);

    const safeUpdate = { ...updateData };
    delete safeUpdate.project;
    delete safeUpdate.createdBy;
    delete safeUpdate.isArchived;
    safeUpdate.updatedBy = userId;

    const milestone = await Milestone.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!milestone) {
      throw new Error("Milestone not found.");
    }

    return milestone;
  } catch (error) {
    throw handleServiceError(error, "Failed to update milestone.");
  }
}

async function archiveMilestone(id, userId) {
  try {
    const existing = await getMilestoneById(id);
    await assertMilestoneWriteAccess(existing.project, userId);

    const milestone = await Milestone.findByIdAndUpdate(
      id,
      { isArchived: true, updatedBy: userId },
      { new: true }
    ).lean();

    if (!milestone) {
      throw new Error("Milestone not found.");
    }

    return milestone;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive milestone.");
  }
}

module.exports = {
  createMilestone,
  getMilestoneById,
  assertMilestoneViewAccess,
  listMilestonesForUser,
  updateMilestone,
  archiveMilestone,
};
