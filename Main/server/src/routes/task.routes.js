const express = require("express");
const taskController = require("../controllers/taskController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { taskCreate, taskUpdate } = require("../validators/task.validators");

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a task inside a project (any workspace member with access; contributors may only self-assign)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Task created }
 *       400: { description: Project not found, archived, invalid assignee, or validation failure }
 */
router.post("/", validate(taskCreate), taskController.createTask);

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: List tasks the current user can access, optionally filtered by projectId or assignedTo=me
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: projectId, in: query, required: false, schema: { type: string } }
 *       - { name: assignedTo, in: query, required: false, schema: { type: string }, description: "user id, or 'me'" }
 *     responses:
 *       200: { description: List of tasks }
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
 */
router.get("/:id", taskController.getTask);

/**
 * @openapi
 * /tasks/{id}:
 *   put:
 *     summary: Update a task (workspace owner/admin, or the task's creator/assignee)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated task }
 *       403: { description: Not authorized (no workspace access, or not your task) }
 */
router.put("/:id", validate(taskUpdate), taskController.updateTask);

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     summary: Archive a task (workspace owner/admin, or the task's creator/assignee)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task archived }
 */
router.delete("/:id", taskController.archiveTask);

module.exports = router;
