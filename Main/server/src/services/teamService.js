const Team = require("../models/Team");
const Startup = require("../models/Startup");
const userService = require("./userService");
const { applyQueryOptions, handleServiceError, normalizeFilter, assertOwner } = require("./serviceUtils");
const { createNotification } = require("./notificationService");
const { sendEmail } = require("./email.service");

async function assertStartupOwner(startupId, userId) {
  const startup = await Startup.findById(startupId).lean();
  if (!startup) {
    throw new Error("Startup not found.");
  }
  assertOwner(startup.founder, userId, "You are not authorized to manage teams for this startup.");
  return startup;
}

async function createTeam({ startupId, name, description, slug }, userId) {
  try {
    await assertStartupOwner(startupId, userId);

    const ownerAsMember = {
      user: userId,
      email: "",
      role: "admin",
      status: "active",
      invitedBy: userId,
      joinedAt: new Date(),
    };

    const team = await Team.create({
      startup: startupId,
      name,
      description: description || "",
      slug: slug || undefined,
      owner: userId,
      members: [ownerAsMember],
      memberCount: 1,
    });

    return team.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create team.");
  }
}

async function getTeamById(id) {
  try {
    const team = await Team.findById(id).lean();
    if (!team) {
      throw new Error("Team not found.");
    }
    return team;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch team.");
  }
}

async function listTeams(filter = {}, options = {}, userId) {
  try {
    const base = normalizeFilter(filter);

    if (userId) {
      base.$or = [{ owner: userId }, { "members.user": userId }];
    }

    const query = Team.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list teams.");
  }
}

async function updateTeam(id, userId, updateData) {
  try {
    const existing = await getTeamById(id);
    assertOwner(existing.owner, userId, "You are not authorized to update this team.");

    const safeUpdate = { ...updateData };
    delete safeUpdate.startup;
    delete safeUpdate.owner;
    delete safeUpdate.members;
    delete safeUpdate.memberCount;
    delete safeUpdate.isArchived;

    const team = await Team.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!team) {
      throw new Error("Team not found.");
    }

    return team;
  } catch (error) {
    throw handleServiceError(error, "Failed to update team.");
  }
}

async function archiveTeam(id, userId) {
  try {
    const existing = await getTeamById(id);
    assertOwner(existing.owner, userId, "You are not authorized to archive this team.");

    const team = await Team.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true }
    ).lean();

    if (!team) {
      throw new Error("Team not found.");
    }

    return team;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive team.");
  }
}

async function inviteMember(id, userId, { email, name, role }) {
  try {
    const team = await Team.findById(id);
    if (!team) {
      throw new Error("Team not found.");
    }
    assertOwner(team.owner, userId, "You are not authorized to invite members to this team.");

    const normalizedEmail = String(email).toLowerCase();
    const alreadyMember = team.members.find(
      (member) => member.email === normalizedEmail
    );
    if (alreadyMember) {
      throw new Error("This email has already been invited to the team.");
    }

    let existingUser = null;
    try {
      existingUser = await userService.getUserByEmail(normalizedEmail);
    } catch (lookupError) {
      existingUser = null;
    }
    if (existingUser && existingUser._id.toString() === userId) {
      throw new Error("You are already a member of this team.");
    }

    const member = {
      user: existingUser ? existingUser._id : null,
      email: normalizedEmail,
      name: name || (existingUser ? existingUser.fullName : ""),
      role: role || "member",
      status: "pending",
      invitedBy: userId,
      invitedAt: new Date(),
    };

    team.members.push(member);
    team.memberCount = team.members.length;
    await team.save();

    const savedTeam = team.toObject();
    const savedMember = savedTeam.members[savedTeam.members.length - 1];

    try {
      if (existingUser) {
        await createNotification({
          recipient: existingUser._id,
          type: "team_invite",
          title: "You have been invited to a team",
          message: `You have been invited to join the team "${team.name}".`,
          data: { teamId: String(team._id), teamName: team.name },
        });
      }

      await sendEmail({
        to: normalizedEmail,
        subject: `You have been invited to join ${team.name}`,
        text: `You have been invited to join the team "${team.name}" on TrustNet. Sign in to accept the invitation.`,
        html: `<p>You have been invited to join the team <strong>${team.name}</strong> on TrustNet.</p><p>Sign in to accept the invitation.</p>`,
      });
    } catch (notifyError) {
      // Notification/email failures must not block the invite creation.
      console.error("teamService.inviteMember: notify/email failed:", notifyError.message);
    }

    return { team: savedTeam, member: savedMember };
  } catch (error) {
    throw handleServiceError(error, "Failed to invite member.");
  }
}

async function acceptInvite(id, memberId, userId, userEmail) {
  try {
    const team = await Team.findById(id);
    if (!team) {
      throw new Error("Team not found.");
    }

    const member = team.members.id(memberId);
    if (!member) {
      throw new Error("Invitation not found.");
    }

    const normalizedEmail = String(userEmail || "").toLowerCase();
    const matches =
      (member.user && member.user.toString() === String(userId)) ||
      (normalizedEmail && member.email === normalizedEmail);
    if (!matches) {
      throw new Error("You are not authorized to accept this invitation.");
    }

    if (member.status === "active") {
      throw new Error("This invitation has already been accepted.");
    }

    member.status = "active";
    member.user = userId;
    member.joinedAt = new Date();
    await team.save();

    const savedTeam = team.toObject();

    try {
      if (String(team.owner) !== String(userId)) {
        await createNotification({
          recipient: team.owner,
          type: "team_invite_accepted",
          title: "Team invitation accepted",
          message: `${member.name || member.email} accepted the invitation to join "${team.name}".`,
          data: { teamId: String(team._id), teamName: team.name, memberId: String(member._id) },
        });
      }
    } catch (notifyError) {
      // Notification failures must not block the accept.
      console.error("teamService.acceptInvite: notify failed:", notifyError.message);
    }

    return savedTeam;
  } catch (error) {
    throw handleServiceError(error, "Failed to accept invitation.");
  }
}

async function removeMember(id, memberId, userId) {
  try {
    const team = await Team.findById(id);
    if (!team) {
      throw new Error("Team not found.");
    }

    const member = team.members.id(memberId);
    if (!member) {
      throw new Error("Member not found.");
    }

    const isOwner = String(team.owner) === String(userId);

    if (!isOwner && member.user && member.user.toString() !== String(userId)) {
      throw new Error("You are not authorized to remove this member.");
    }

    if (member.user && member.user.toString() === String(team.owner)) {
      throw new Error("The team owner cannot be removed.");
    }

    const removedUserId = member.user ? member.user.toString() : null;
    const removedLabel = member.name || member.email;

    team.members.pull(memberId);
    team.memberCount = Math.max(0, team.members.length);
    await team.save();

    const savedTeam = team.toObject();

    try {
      if (isOwner && removedUserId && removedUserId !== String(userId)) {
        await createNotification({
          recipient: removedUserId,
          type: "team_member_removed",
          title: "Removed from team",
          message: `You have been removed from the team "${team.name}".`,
          data: { teamId: String(team._id), teamName: team.name },
        });
      } else if (!isOwner && removedUserId === String(userId)) {
        await createNotification({
          recipient: team.owner,
          type: "team_member_left",
          title: "Member left the team",
          message: `${removedLabel} left the team "${team.name}".`,
          data: { teamId: String(team._id), teamName: team.name },
        });
      }
    } catch (notifyError) {
      // Notification failures must not block the removal.
      console.error("teamService.removeMember: notify failed:", notifyError.message);
    }

    return savedTeam;
  } catch (error) {
    throw handleServiceError(error, "Failed to remove member.");
  }
}

async function changeMemberRole(id, memberId, userId, role) {
  try {
    const team = await Team.findById(id);
    if (!team) {
      throw new Error("Team not found.");
    }
    assertOwner(team.owner, userId, "You are not authorized to change member roles.");

    const member = team.members.id(memberId);
    if (!member) {
      throw new Error("Member not found.");
    }

    member.role = role;
    await team.save();

    const savedTeam = team.toObject();

    try {
      if (member.user) {
        await createNotification({
          recipient: member.user,
          type: "team_member_role_changed",
          title: "Team role updated",
          message: `Your role in "${team.name}" was changed to ${role}.`,
          data: { teamId: String(team._id), teamName: team.name, role },
        });
      }
    } catch (notifyError) {
      // Notification failures must not block the role change.
      console.error("teamService.changeMemberRole: notify failed:", notifyError.message);
    }

    return savedTeam;
  } catch (error) {
    throw handleServiceError(error, "Failed to change member role.");
  }
}

module.exports = {
  createTeam,
  getTeamById,
  listTeams,
  updateTeam,
  archiveTeam,
  inviteMember,
  acceptInvite,
  removeMember,
  changeMemberRole,
};
