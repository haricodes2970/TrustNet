const taskService = require("../services/taskService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

function isPlatformAdmin(req) {
  return req.user.role === "admin";
}

function statusOf(error, fallback = 400) {
  return error instanceof ApiError ? error.statusCode : fallback;
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Task", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

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
      req.user.id,
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "task.create", task._id, { projectId: req.body.projectId, title: task.title });
    return res.status(201).json({ success: true, data: task });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function getTask(req, res) {
  try {
    const task = await taskService.getTaskById(req.params.id);
    await taskService.assertTaskViewAccess(task, req.user.id, { isAdmin: isPlatformAdmin(req) });
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return res.status(statusOf(error, 404)).json({ success: false, message: error.message });
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
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    if (req.query.search) {
      filter.search = req.query.search;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const tasks = await taskService.listTasksForUser(req.user.id, filter, options);
    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateTask(req, res) {
  try {
    const task = await taskService.updateTask(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "task.update", task._id, { fields: Object.keys(req.body) });
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function archiveTask(req, res) {
  try {
    const task = await taskService.archiveTask(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "task.archive", task._id, {});
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function restoreTask(req, res) {
  try {
    const task = await taskService.restoreTask(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "task.restore", task._id, {});
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createTask,
  getTask,
  listTasks,
  updateTask,
  archiveTask,
  restoreTask,
};
