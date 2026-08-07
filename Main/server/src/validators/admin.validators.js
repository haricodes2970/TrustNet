const Joi = require("joi");

const ROLES = ["founder", "entrepreneur", "investor", "client", "mentor", "builder", "admin"];

const changeRole = Joi.object({
  role: Joi.string().valid(...ROLES).required(),
});

const moderationReason = Joi.object({
  reason: Joi.string().trim().max(500).allow("", null),
});

const moderateContent = Joi.object({
  action: Joi.string().valid("hide", "restore", "delete").required(),
  reason: Joi.string().trim().max(500).allow("", null),
});

module.exports = { changeRole, moderationReason, moderateContent };
