const express = require("express");
const milestoneController = require("../controllers/milestoneController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { milestoneCreate, milestoneUpdate } = require("../validators/milestone.validators");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /milestones:
 *   post:
 *     summary: Create a milestone inside a project (workspace owner/admin only)
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Milestone created }
 *       400: { description: Project not found, archived, or validation failure }
 */
router.post("/", validate(milestoneCreate), milestoneController.createMilestone);

/**
 * @openapi
 * /milestones:
 *   get:
 *     summary: List milestones the current user can access, optionally filtered by projectId
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: projectId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of milestones }
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
 */
router.get("/:id", milestoneController.getMilestone);

/**
 * @openapi
 * /milestones/{id}:
 *   put:
 *     summary: Update a milestone (workspace owner/admin only)
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated milestone }
 */
router.put("/:id", validate(milestoneUpdate), milestoneController.updateMilestone);

/**
 * @openapi
 * /milestones/{id}:
 *   delete:
 *     summary: Archive a milestone (workspace owner/admin only)
 *     tags: [Milestones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Milestone archived }
 */
router.delete("/:id", milestoneController.archiveMilestone);

module.exports = router;
