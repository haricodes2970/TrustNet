const Joi = require("joi");

const STATUSES = ["planned", "in_progress", "completed", "missed", "archived"];

const milestoneCreate = Joi.object({
  projectId: Joi.string().required(),
  title: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(2000).allow(""),
  dueDate: Joi.date().iso(),
}).unknown(true);

const milestoneUpdate = Joi.object({
  title: Joi.string().trim().min(2).max(150),
  description: Joi.string().trim().max(2000).allow(""),
  dueDate: Joi.date().iso().allow(null),
  status: Joi.string().valid(...STATUSES),
}).unknown(true);

module.exports = { milestoneCreate, milestoneUpdate };
