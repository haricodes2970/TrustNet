const Joi = require("joi");

const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "archived"];

const projectCreate = Joi.object({
  workspaceId: Joi.string().required(),
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(2000).allow(""),
  status: Joi.string().valid(...PROJECT_STATUSES),
}).unknown(true);

const projectUpdate = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  description: Joi.string().trim().max(2000).allow(""),
  status: Joi.string().valid(...PROJECT_STATUSES),
}).unknown(true);

module.exports = { projectCreate, projectUpdate };
