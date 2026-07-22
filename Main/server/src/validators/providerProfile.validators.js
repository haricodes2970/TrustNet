const Joi = require("joi");

const providerProfileCreate = Joi.object({
  businessName: Joi.string().trim().max(150).required(),
  tagline: Joi.string().trim().max(160).allow(""),
  description: Joi.string().trim().max(2000).allow(""),
  serviceCategories: Joi.array().items(Joi.string().trim().max(50)).max(20),
  portfolioUrl: Joi.string().trim().uri().allow(""),
}).unknown(true);

const providerProfileUpdate = Joi.object({
  businessName: Joi.string().trim().max(150),
  tagline: Joi.string().trim().max(160).allow(""),
  description: Joi.string().trim().max(2000).allow(""),
  serviceCategories: Joi.array().items(Joi.string().trim().max(50)).max(20),
  portfolioUrl: Joi.string().trim().uri().allow(""),
}).unknown(true);

module.exports = { providerProfileCreate, providerProfileUpdate };
