const express = require("express");
const workspaceController = require("../controllers/workspaceController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { workspaceCreate, workspaceUpdate } = require("../validators/workspace.validators");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /workspaces:
 *   post:
 *     summary: Create a workspace for a startup (one per startup)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Workspace created }
 *       400: { description: A workspace already exists for this startup }
 */
router.post("/", validate(workspaceCreate), workspaceController.createWorkspace);

/**
 * @openapi
 * /workspaces:
 *   get:
 *     summary: List workspaces the current user owns or belongs to (via Team membership)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of workspaces }
 */
router.get("/", workspaceController.listWorkspaces);

/**
 * @openapi
 * /workspaces/{id}:
 *   get:
 *     summary: Get a single workspace
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Workspace details }
 *       403: { description: Not authorized to view this workspace }
 */
router.get("/:id", workspaceController.getWorkspace);

/**
 * @openapi
 * /workspaces/{id}:
 *   put:
 *     summary: Update a workspace (owner or admin-tier Team member)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated workspace }
 */
router.put("/:id", validate(workspaceUpdate), workspaceController.updateWorkspace);

/**
 * @openapi
 * /workspaces/{id}:
 *   delete:
 *     summary: Archive a workspace (owner only)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Workspace archived }
 */
router.delete("/:id", workspaceController.archiveWorkspace);

/**
 * @openapi
 * /workspaces/{id}/members:
 *   get:
 *     summary: List effective workspace members (owner + mapped Team roster)
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: List of effective workspace members }
 */
router.get("/:id/members", workspaceController.listMembers);

module.exports = router;
