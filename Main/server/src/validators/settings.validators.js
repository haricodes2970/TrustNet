const Joi = require("joi");

const preferences = Joi.object({
  notifications: Joi.boolean(),
  emailNotifications: Joi.boolean(),
  marketingEmails: Joi.boolean(),
  theme: Joi.string().valid("system", "light", "dark"),
  language: Joi.string().trim().min(2).max(10),
  timezone: Joi.string().trim().max(64),
}).unknown(true);

const privacy = Joi.object({
  privacy: Joi.string().valid("public", "private", "connections"),
  profileVisibility: Joi.string().valid("public", "private", "connections"),
  allowMessages: Joi.boolean(),
  allowCollaborationRequests: Joi.boolean(),
}).unknown(true);

const appearance = Joi.object({
  theme: Joi.string().valid("system", "light", "dark"),
  language: Joi.string().trim().min(2).max(10),
  timezone: Joi.string().trim().max(64),
}).unknown(true);

module.exports = { preferences, privacy, appearance };
