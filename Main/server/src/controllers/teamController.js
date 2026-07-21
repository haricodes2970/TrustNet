const teamService = require("../services/teamService");
const ApiError = require("../utils/ApiError");

async function createTeam(req, res) {
  try {
    const team = await teamService.createTeam(
      {
        startupId: req.body.startupId,
        name: req.body.name,
        description: req.body.description,
        slug: req.body.slug,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: team });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getTeam(req, res) {
  try {
    const team = await teamService.getTeamById(req.params.id);
    const isOwner = String(team.owner) === String(req.user.id);
    const isMember = (team.members || []).some(
      (member) => member.user && member.user.toString() === String(req.user.id)
    );
    if (!isOwner && !isMember) {
      throw new ApiError(403, "You are not authorized to view this team.");
    }
    return res.status(200).json({ success: true, data: team });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listTeams(req, res) {
  try {
    const teams = await teamService.listTeams(
      req.query.filter || {},
      req.query.options || {},
      req.user.id
    );
    return res.status(200).json({ success: true, data: teams });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateTeam(req, res) {
  try {
    const team = await teamService.updateTeam(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: team });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveTeam(req, res) {
  try {
    const team = await teamService.archiveTeam(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: team });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function inviteMember(req, res) {
  try {
    const result = await teamService.inviteMember(req.params.id, req.user.id, req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function acceptInvite(req, res) {
  try {
    const team = await teamService.acceptInvite(
      req.params.id,
      req.params.memberId,
      req.user.id,
      req.user.email
    );
    return res.status(200).json({ success: true, data: team });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function removeMember(req, res) {
  try {
    const team = await teamService.removeMember(
      req.params.id,
      req.params.memberId,
      req.user.id
    );
    return res.status(200).json({ success: true, data: team });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function changeMemberRole(req, res) {
  try {
    const team = await teamService.changeMemberRole(
      req.params.id,
      req.params.memberId,
      req.user.id,
      req.body.role
    );
    return res.status(200).json({ success: true, data: team });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createTeam,
  getTeam,
  listTeams,
  updateTeam,
  archiveTeam,
  inviteMember,
  acceptInvite,
  removeMember,
  changeMemberRole,
};
