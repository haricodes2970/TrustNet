const express = require("express");
const projectController = require("../controllers/projectController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { projectCreate, projectUpdate } = require("../validators/project.validators");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /projects:
 *   post:
 *     summary: Create a project inside a workspace (workspace owner/admin only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Project created }
 *       400: { description: Workspace not found, archived, or validation failure }
 */
router.post("/", validate(projectCreate), projectController.createProject);

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: List projects the current user can access, optionally filtered by workspaceId
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: workspaceId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of projects }
 */
router.get("/", projectController.listProjects);

/**
 * @openapi
 * /projects/{id}:
 *   get:
 *     summary: Get a single project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Project details }
 *       403: { description: Not authorized to view this project }
 */
router.get("/:id", projectController.getProject);

/**
 * @openapi
 * /projects/{id}:
 *   put:
 *     summary: Update a project (workspace owner/admin only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated project }
 */
router.put("/:id", validate(projectUpdate), projectController.updateProject);

/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     summary: Archive a project (workspace owner/admin only)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Project archived }
 */
router.delete("/:id", projectController.archiveProject);

module.exports = router;
