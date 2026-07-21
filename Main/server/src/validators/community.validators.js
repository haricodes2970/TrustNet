const Joi = require("joi");

const communityCreate = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
  slug: Joi.string().trim().lowercase().min(3).max(80).regex(/^[a-z0-9-]+$/).required(),
  description: Joi.string().trim().max(2000).required(),
  category: Joi.string().valid("startup", "investor", "mentor", "general", "industry", "innovation"),
  type: Joi.string().valid("public", "private", "restricted"),
  rules: Joi.array().items(Joi.string().trim().max(200)).default([]),
  tags: Joi.array().items(Joi.string().trim().max(30)).default([]),
  coverImageUrl: Joi.string().uri().allow(""),
}).unknown(true);

const communityUpdate = Joi.object({
  name: Joi.string().trim().min(3).max(100),
  slug: Joi.string().trim().lowercase().min(3).max(80).regex(/^[a-z0-9-]+$/),
  description: Joi.string().trim().max(2000),
  category: Joi.string().valid("startup", "investor", "mentor", "general", "industry", "innovation"),
  type: Joi.string().valid("public", "private", "restricted"),
  rules: Joi.array().items(Joi.string().trim().max(200)),
  tags: Joi.array().items(Joi.string().trim().max(30)),
  coverImageUrl: Joi.string().uri().allow(""),
}).unknown(true);

module.exports = { communityCreate, communityUpdate };
