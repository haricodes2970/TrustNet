const express = require("express");
const milestoneController = require("../controllers/milestoneController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { milestoneCreate, milestoneUpdate } = require("../validators/milestone.validators");

const router = express.Router();

router.use(authenticate);
// No role list - just populates req.user.role so controllers can grant a
// platform admin override alongside the existing Workspace-role checks.
router.use(authorize());

/**
 * @openapi
 * /milestones:
 *   post:
 *     summary: Create a milestone inside a project (workspace owner/admin, or platform admin)
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Milestone created }
 *       404: { description: Project not found }
 *       409: { description: Project archived, or a milestone with this title already exists in it }
 */
router.post("/", validate(milestoneCreate), milestoneController.createMilestone);

/**
 * @openapi
 * /milestones:
 *   get:
 *     summary: List milestones the current user can access, filterable by projectId/status/search, paginated
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: projectId, in: query, required: false, schema: { type: string } }
 *       - { name: status, in: query, required: false, schema: { type: string } }
 *       - { name: search, in: query, required: false, schema: { type: string } }
 *       - { name: limit, in: query, required: false, schema: { type: integer } }
 *       - { name: skip, in: query, required: false, schema: { type: integer } }
 *     responses:
 *       200: { description: List of milestones (archived excluded by default) }
 */
router.get("/", milestoneController.listMilestones);

/**
 * @openapi
 * /milestones/{id}:
 *   get:
 *     summary: Get a single milestone
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Milestone details }
 *       403: { description: Not authorized to view this milestone }
 *       404: { description: Milestone not found }
 */
router.get("/:id", milestoneController.getMilestone);

/**
 * @openapi
 * /milestones/{id}:
 *   put:
 *     summary: Update a milestone (workspace owner/admin, or platform admin)
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated milestone }
 *       409: { description: Milestone or parent project archived, or duplicate title }
 */
router.put("/:id", validate(milestoneUpdate), milestoneController.updateMilestone);

/**
 * @openapi
 * /milestones/{id}:
 *   delete:
 *     summary: Archive a milestone (workspace owner/admin, or platform admin)
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Milestone archived }
 */
router.delete("/:id", milestoneController.archiveMilestone);

/**
 * @openapi
 * /milestones/{id}/restore:
 *   post:
 *     summary: Restore an archived milestone (workspace owner/admin, or platform admin)
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Milestone restored }
 *       409: { description: The parent project is still archived }
 */
router.post("/:id/restore", milestoneController.restoreMilestone);

module.exports = router;
