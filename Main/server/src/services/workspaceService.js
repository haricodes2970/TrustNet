const Workspace = require("../models/Workspace");
const Startup = require("../models/Startup");
const Team = require("../models/Team");
const { applyQueryOptions, handleServiceError, normalizeFilter, assertOwner } = require("./serviceUtils");

async function assertStartupFounder(startupId, userId) {
  const startup = await Startup.findById(startupId).lean();
  if (!startup) {
    throw new Error("Startup not found.");
  }
  assertOwner(startup.founder, userId, "You are not authorized to manage a workspace for this startup.");
  return startup;
}

async function createWorkspace({ startupId, name, description, settings }, userId) {
  try {
    await assertStartupFounder(startupId, userId);

    const existing = await Workspace.findOne({ startup: startupId }).lean();
    if (existing) {
      throw new Error("A workspace already exists for this startup.");
    }

    const workspace = await Workspace.create({
      startup: startupId,
      name,
      description: description || "",
      owner: userId,
      settings: settings || undefined,
    });

    return workspace.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create workspace.");
  }
}

async function getWorkspaceById(id) {
  try {
    const workspace = await Workspace.findById(id).lean();
    if (!workspace) {
      throw new Error("Workspace not found.");
    }
    return workspace;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch workspace.");
  }
}

async function listWorkspacesForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);
    const teams = await Team.find({ "members.user": userId, "members.status": "active" })
      .select("startup")
      .lean();
    const teamStartupIds = teams.map((team) => team.startup);

    base.$or = [{ owner: userId }, { startup: { $in: teamStartupIds } }];

    const query = Workspace.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list workspaces.");
  }
}

async function updateWorkspace(id, userId, updateData) {
  try {
    const existing = await getWorkspaceById(id);
    const access = await resolveWorkspaceAccess(id, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new Error("You are not authorized to update this workspace.");
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.startup;
    delete safeUpdate.owner;
    delete safeUpdate.isArchived;

    const workspace = await Workspace.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    return workspace;
  } catch (error) {
    throw handleServiceError(error, "Failed to update workspace.");
  }
}

async function archiveWorkspace(id, userId) {
  try {
    const existing = await getWorkspaceById(id);
    assertOwner(existing.owner, userId, "You are not authorized to archive this workspace.");

    const workspace = await Workspace.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true }
    ).lean();

    if (!workspace) {
      throw new Error("Workspace not found.");
    }

    return workspace;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive workspace.");
  }
}

async function listWorkspaceMembers(id, userId) {
  try {
    const workspace = await getWorkspaceById(id);
    const access = await resolveWorkspaceAccess(id, userId);
    if (!access.role) {
      throw new Error("You are not authorized to view this workspace.");
    }

    const team = await Team.findOne({ startup: workspace.startup }).lean();

    const members = [
      {
        user: workspace.owner,
        role: "owner",
        status: "active",
      },
    ];

    if (team) {
      team.members
        .filter((member) => member.status === "active" && String(member.user) !== String(workspace.owner))
        .forEach((member) => {
          members.push({
            user: member.user,
            email: member.email,
            name: member.name,
            role: member.role === "admin" ? "admin" : "contributor",
            status: "active",
          });
        });
    }

    return members;
  } catch (error) {
    throw handleServiceError(error, "Failed to list workspace members.");
  }
}

async function resolveWorkspaceAccess(workspaceId, userId) {
  try {
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return { role: null };
    }

    if (String(workspace.owner) === String(userId)) {
      return { role: "owner" };
    }

    const team = await Team.findOne({ startup: workspace.startup }).lean();
    if (!team) {
      return { role: null };
    }

    const member = team.members.find(
      (m) => m.user && String(m.user) === String(userId) && m.status === "active"
    );

    if (!member) {
      return { role: null };
    }

    return { role: member.role === "admin" ? "admin" : "contributor" };
  } catch (error) {
    throw handleServiceError(error, "Failed to resolve workspace access.");
  }
}

module.exports = {
  createWorkspace,
  getWorkspaceById,
  listWorkspacesForUser,
  updateWorkspace,
  archiveWorkspace,
  listWorkspaceMembers,
  resolveWorkspaceAccess,
};
