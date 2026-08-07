const express = require("express");
const teamController = require("../controllers/teamController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { teamCreate, teamUpdate, memberInvite, memberRole } = require("../validators/team.validators");

const router = express.Router();

router.use(authenticate);
// No role list - just populates req.user.role so controllers can grant a
// platform admin override alongside the existing owner/team-admin checks.
router.use(authorize());

/**
 * @openapi
 * /teams:
 *   post:
 *     summary: Create a team for a startup
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Team created }
 */
router.post("/", validate(teamCreate), teamController.createTeam);

/**
 * @openapi
 * /teams:
 *   get:
 *     summary: List teams the current user owns or belongs to
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of teams }
 */
router.get("/", teamController.listTeams);

/**
 * @openapi
 * /teams/{id}:
 *   get:
 *     summary: Get a single team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Team details }
 */
router.get("/:id", teamController.getTeam);

/**
 * @openapi
 * /teams/{id}:
 *   put:
 *     summary: Update a team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated team }
 */
router.put("/:id", validate(teamUpdate), teamController.updateTeam);

/**
 * @openapi
 * /teams/{id}:
 *   delete:
 *     summary: Archive a team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Team archived }
 */
router.delete("/:id", teamController.archiveTeam);

/**
 * @openapi
 * /teams/{id}/restore:
 *   post:
 *     summary: Restore an archived team (owner or platform admin)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Team restored }
 *       409: { description: The underlying startup is still deleted }
 */
router.post("/:id/restore", teamController.restoreTeam);

/**
 * @openapi
 * /teams/{id}/members:
 *   post:
 *     summary: Invite a member to a team by email
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Member invited }
 */
router.post("/:id/members", validate(memberInvite), teamController.inviteMember);

/**
 * @openapi
 * /teams/{id}/members/{memberId}/accept:
 *   put:
 *     summary: Accept a team invitation
 *     description: Notifies the team owner that the invitation was accepted.
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: memberId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Invitation accepted }
 */
router.put("/:id/members/:memberId/accept", teamController.acceptInvite);

/**
 * @openapi
 * /teams/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a member or leave a team
 *     description: Notifies the removed member (if removed by the owner) or the owner (if the member left).
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: memberId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Member removed }
 */
router.delete("/:id/members/:memberId", teamController.removeMember);

/**
 * @openapi
 * /teams/{id}/members/{memberId}/role:
 *   put:
 *     summary: Change a member's role
 *     description: Notifies the affected member of the role change.
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: memberId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Member role updated }
 */
router.put("/:id/members/:memberId/role", validate(memberRole), teamController.changeMemberRole);

module.exports = router;
