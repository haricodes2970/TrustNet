const Joi = require("joi");

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["todo", "in_progress", "in_review", "done", "archived"];

const taskCreate = Joi.object({
  projectId: Joi.string().required(),
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(5000).allow(""),
  priority: Joi.string().valid(...PRIORITIES),
  dueDate: Joi.date().iso(),
  assignedTo: Joi.string().allow(null),
}).unknown(true);

const taskUpdate = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().max(5000).allow(""),
  priority: Joi.string().valid(...PRIORITIES),
  status: Joi.string().valid(...STATUSES),
  dueDate: Joi.date().iso().allow(null),
  assignedTo: Joi.string().allow(null),
  // milestone assignment is update-only — a task must exist before it can be
  // grouped under a milestone (create -> assign, not create-with-milestone).
  milestone: Joi.string().allow(null),
}).unknown(true);

module.exports = { taskCreate, taskUpdate };
