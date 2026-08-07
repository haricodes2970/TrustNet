const express = require("express");
const projectController = require("../controllers/projectController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { projectCreate, projectUpdate } = require("../validators/project.validators");

const router = express.Router();

router.use(authenticate);
// No role list - just populates req.user.role so controllers can grant a
// platform admin override alongside the existing Workspace-role checks.
router.use(authorize());

/**
 * @openapi
 * /projects:
 *   post:
 *     summary: Create a project inside a workspace (workspace owner/admin, or platform admin)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Project created }
 *       404: { description: Workspace not found }
 *       409: { description: Workspace archived, or a project with this name already exists in it }
 */
router.post("/", validate(projectCreate), projectController.createProject);

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: List projects the current user can access, optionally filtered by workspaceId/status/search, paginated
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: workspaceId, in: query, required: false, schema: { type: string } }
 *       - { name: status, in: query, required: false, schema: { type: string } }
 *       - { name: search, in: query, required: false, schema: { type: string } }
 *       - { name: limit, in: query, required: false, schema: { type: integer } }
 *       - { name: skip, in: query, required: false, schema: { type: integer } }
 *     responses:
 *       200: { description: List of projects (archived excluded by default) }
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
 *       404: { description: Project not found }
 */
router.get("/:id", projectController.getProject);

/**
 * @openapi
 * /projects/{id}:
 *   put:
 *     summary: Update a project (workspace owner/admin, or platform admin)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated project }
 *       409: { description: Project or parent workspace archived, or duplicate name }
 */
router.put("/:id", validate(projectUpdate), projectController.updateProject);

/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     summary: Archive a project (workspace owner/admin, or platform admin)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Project archived }
 */
router.delete("/:id", projectController.archiveProject);

/**
 * @openapi
 * /projects/{id}/restore:
 *   post:
 *     summary: Restore an archived project (workspace owner/admin, or platform admin)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Project restored }
 *       409: { description: The parent workspace is still archived }
 */
router.post("/:id/restore", projectController.restoreProject);

module.exports = router;
