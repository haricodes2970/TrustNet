const taskService = require("../services/taskService");
const ApiError = require("../utils/ApiError");

async function createTask(req, res) {
  try {
    const task = await taskService.createTask(
      {
        projectId: req.body.projectId,
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        dueDate: req.body.dueDate,
        assignedTo: req.body.assignedTo,
      },
      req.user.id
    );
    return res.status(201).json({ success: true, data: task });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getTask(req, res) {
  try {
    const task = await taskService.getTaskById(req.params.id);
    await taskService.assertTaskViewAccess(task, req.user.id);
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listTasks(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.projectId) {
      filter.project = req.query.projectId;
    }
    if (req.query.assignedTo) {
      filter.assignedTo = req.query.assignedTo === "me" ? req.user.id : req.query.assignedTo;
    }
    const tasks = await taskService.listTasksForUser(req.user.id, filter, req.query.options || {});
    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateTask(req, res) {
  try {
    const task = await taskService.updateTask(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveTask(req, res) {
  try {
    const task = await taskService.archiveTask(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createTask,
  getTask,
  listTasks,
  updateTask,
  archiveTask,
};
