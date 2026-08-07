const Workspace = require("../models/Workspace");
const Startup = require("../models/Startup");
const Team = require("../models/Team");
const ApiError = require("../utils/ApiError");
const { applyQueryOptions, handleServiceError, normalizeFilter, assertOwner } = require("./serviceUtils");

async function assertStartupFounder(startupId, userId, { isAdmin = false } = {}) {
  const startup = await Startup.findById(startupId).lean();
  if (!startup) {
    throw new ApiError(404, "Startup not found.");
  }
  if (isAdmin) {
    return startup;
  }
  assertOwner(startup.founder, userId, "You are not authorized to manage a workspace for this startup.", 403);
  return startup;
}

async function createWorkspace({ startupId, name, description, settings }, userId, { isAdmin = false } = {}) {
  try {
    const startup = await assertStartupFounder(startupId, userId, { isAdmin });
    if (startup.deletedAt) {
      throw new ApiError(409, "This startup has been deleted. Restore it before creating a workspace.");
    }

    const existing = await Workspace.findOne({ startup: startupId }).lean();
    if (existing) {
      throw new ApiError(409, "A workspace already exists for this startup.");
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
    if (error.code === 11000 && error.keyPattern && error.keyPattern.startup) {
      throw new ApiError(409, "A workspace already exists for this startup.");
    }
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

async function updateWorkspace(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getWorkspaceById(id);
    if (!isAdmin) {
      const access = await resolveWorkspaceAccess(id, userId);
      if (access.role !== "owner" && access.role !== "admin") {
        throw new ApiError(403, "You are not authorized to update this workspace.");
      }
    }
    if (existing.isArchived) {
      throw new ApiError(409, "This workspace is archived. Restore it before making changes.");
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
      throw new ApiError(404, "Workspace not found.");
    }

    return workspace;
  } catch (error) {
    throw handleServiceError(error, "Failed to update workspace.");
  }
}

async function archiveWorkspace(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getWorkspaceById(id);
    if (!isAdmin) {
      assertOwner(existing.owner, userId, "You are not authorized to archive this workspace.", 403);
    }

    const workspace = await Workspace.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true }
    ).lean();

    if (!workspace) {
      throw new ApiError(404, "Workspace not found.");
    }

    return workspace;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive workspace.");
  }
}

async function restoreWorkspace(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getWorkspaceById(id);
    if (!isAdmin) {
      assertOwner(existing.owner, userId, "You are not authorized to restore this workspace.", 403);
    }

    const startup = await Startup.findById(existing.startup).lean();
    if (!startup || startup.deletedAt) {
      throw new ApiError(409, "Restore the startup before restoring its workspace.");
    }

    const workspace = await Workspace.findByIdAndUpdate(
      id,
      { isArchived: false },
      { new: true }
    ).lean();

    if (!workspace) {
      throw new ApiError(404, "Workspace not found.");
    }

    return workspace;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore workspace.");
  }
}

// A startup has MANY teams (1 startup : N teams — see docs/modules/
// startups.md), so a single Team.findOne() here silently ignored
// membership in every team but whichever one Mongo happened to return
// first: an admin/contributor of a startup's second or third team was
// getting denied all workspace access. Checks every non-archived team for
// the startup and returns the highest privilege found (admin beats
// contributor; ownership is resolved separately by the caller since it
// isn't a Team-membership concept).
async function resolveHighestTeamRole(startupId, userId) {
  const teams = await Team.find({ startup: startupId, isArchived: false }).lean();

  let best = null;
  for (const team of teams) {
    const member = team.members.find(
      (m) => m.user && String(m.user) === String(userId) && m.status === "active"
    );
    if (!member) continue;
    const role = member.role === "admin" ? "admin" : "contributor";
    if (role === "admin") {
      return "admin";
    }
    best = best || role;
  }
  return best;
}

async function listWorkspaceMembers(id, userId, { isAdmin = false } = {}) {
  try {
    const workspace = await getWorkspaceById(id);
    if (!isAdmin) {
      const access = await resolveWorkspaceAccess(id, userId);
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to view this workspace.");
      }
    }

    const teams = await Team.find({ startup: workspace.startup, isArchived: false }).lean();

    // A user can be an active member of more than one team for the same
    // startup - dedupe by user id, keeping the highest role found, so the
    // effective roster doesn't list the same person twice.
    const byUserId = new Map();
    teams.forEach((team) => {
      team.members
        .filter((member) => member.status === "active" && String(member.user) !== String(workspace.owner))
        .forEach((member) => {
          const key = String(member.user);
          const role = member.role === "admin" ? "admin" : "contributor";
          const existing = byUserId.get(key);
          if (!existing || (existing.role !== "admin" && role === "admin")) {
            byUserId.set(key, {
              user: member.user,
              email: member.email,
              name: member.name,
              role,
              status: "active",
            });
          }
        });
    });

    return [{ user: workspace.owner, role: "owner", status: "active" }, ...byUserId.values()];
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

    const role = await resolveHighestTeamRole(workspace.startup, userId);
    return { role };
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
  restoreWorkspace,
  listWorkspaceMembers,
  resolveWorkspaceAccess,
  resolveHighestTeamRole,
};
