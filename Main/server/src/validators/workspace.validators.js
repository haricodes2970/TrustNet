const Joi = require("joi");

const workspaceCreate = Joi.object({
  startupId: Joi.string().required(),
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(2000).allow(""),
  settings: Joi.object({
    defaultVisibility: Joi.string().valid("private", "team"),
  }),
}).unknown(true);

const workspaceUpdate = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(2000).allow(""),
  settings: Joi.object({
    defaultVisibility: Joi.string().valid("private", "team"),
  }),
}).unknown(true);

module.exports = { workspaceCreate, workspaceUpdate };
