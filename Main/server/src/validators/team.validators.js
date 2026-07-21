const Joi = require("joi");

const teamCreate = Joi.object({
  startupId: Joi.string().required(),
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(2000).allow(""),
  slug: Joi.string().trim().lowercase().min(3).max(80).regex(/^[a-z0-9-]+$/),
}).unknown(true);

const teamUpdate = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(2000).allow(""),
  slug: Joi.string().trim().lowercase().min(3).max(80).regex(/^[a-z0-9-]+$/),
}).unknown(true);

const memberInvite = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().trim().max(100).allow(""),
  role: Joi.string().valid("admin", "member"),
}).unknown(true);

const memberRole = Joi.object({
  role: Joi.string().valid("admin", "member").required(),
}).unknown(true);

module.exports = { teamCreate, teamUpdate, memberInvite, memberRole };
