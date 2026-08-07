const express = require("express");
const taskController = require("../controllers/taskController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { taskCreate, taskUpdate } = require("../validators/task.validators");

const router = express.Router();

router.use(authenticate);
// No role list - just populates req.user.role so controllers can grant a
// platform admin override alongside the existing Workspace-role checks.
router.use(authorize());

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a task inside a project (any workspace member with access; contributors may only self-assign; platform admin override)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Task created }
 *       404: { description: Project not found }
 *       409: { description: Project archived }
 *       400: { description: Invalid assignee, or validation failure }
 */
router.post("/", validate(taskCreate), taskController.createTask);

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: List tasks the current user can access, filterable by projectId/assignedTo/status/priority/search, paginated
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: projectId, in: query, required: false, schema: { type: string } }
 *       - { name: assignedTo, in: query, required: false, schema: { type: string }, description: "user id, or 'me'" }
 *       - { name: status, in: query, required: false, schema: { type: string } }
 *       - { name: priority, in: query, required: false, schema: { type: string } }
 *       - { name: search, in: query, required: false, schema: { type: string } }
 *       - { name: limit, in: query, required: false, schema: { type: integer } }
 *       - { name: skip, in: query, required: false, schema: { type: integer } }
 *     responses:
 *       200: { description: List of tasks (archived excluded by default) }
 */
router.get("/", taskController.listTasks);

/**
 * @openapi
 * /tasks/{id}:
 *   get:
 *     summary: Get a single task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task details }
 *       403: { description: Not authorized to view this task }
 *       404: { description: Task not found }
 */
router.get("/:id", taskController.getTask);

/**
 * @openapi
 * /tasks/{id}:
 *   put:
 *     summary: Update a task (workspace owner/admin, task creator/assignee, or platform admin)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated task }
 *       403: { description: Not authorized (no workspace access, or not your task) }
 *       409: { description: Task is archived }
 */
router.put("/:id", validate(taskUpdate), taskController.updateTask);

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     summary: Archive a task (workspace owner/admin, task creator/assignee, or platform admin)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task archived }
 */
router.delete("/:id", taskController.archiveTask);

/**
 * @openapi
 * /tasks/{id}/restore:
 *   post:
 *     summary: Restore an archived task (workspace owner/admin, task creator/assignee, or platform admin)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task restored }
 *       409: { description: The parent project is still archived }
 */
router.post("/:id/restore", taskController.restoreTask);

module.exports = router;
