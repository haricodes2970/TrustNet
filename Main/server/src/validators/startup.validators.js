const Joi = require("joi");

const startupCreate = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  slug: Joi.string().trim().lowercase().min(3).max(80).regex(/^[a-z0-9-]+$/).required(),
  tagline: Joi.string().trim().max(160).allow(""),
  description: Joi.string().trim().min(50).max(5000).required(),
  category: Joi.string().trim().max(50).required(),
  stage: Joi.string().valid("idea", "validation", "early-stage", "growth", "established"),
  location: Joi.string().trim().max(100).allow(""),
  websiteUrl: Joi.string().uri().allow(""),
  pitchDeckUrl: Joi.string().uri().allow(""),
  logoUrl: Joi.string().uri().allow(""),
  problemStatement: Joi.string().trim().max(2000).allow(""),
  solution: Joi.string().trim().max(2000).allow(""),
  targetMarket: Joi.string().trim().max(500).allow(""),
  fundingGoal: Joi.number().min(0),
  fundingRaised: Joi.number().min(0),
  currency: Joi.string().valid("USD", "EUR", "GBP", "INR", "CAD", "AUD"),
  status: Joi.string().valid("draft", "active", "hidden", "closed"),
  tags: Joi.array().items(Joi.string().trim().max(30)).default([]),
  isFeatured: Joi.boolean(),
  isPublic: Joi.boolean(),
}).unknown(true);

const startupUpdate = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  slug: Joi.string().trim().lowercase().min(3).max(80).regex(/^[a-z0-9-]+$/),
  tagline: Joi.string().trim().max(160).allow(""),
  description: Joi.string().trim().min(50).max(5000),
  category: Joi.string().trim().max(50),
  stage: Joi.string().valid("idea", "validation", "early-stage", "growth", "established"),
  location: Joi.string().trim().max(100).allow(""),
  websiteUrl: Joi.string().uri().allow(""),
  pitchDeckUrl: Joi.string().uri().allow(""),
  logoUrl: Joi.string().uri().allow(""),
  problemStatement: Joi.string().trim().max(2000).allow(""),
  solution: Joi.string().trim().max(2000).allow(""),
  targetMarket: Joi.string().trim().max(500).allow(""),
  fundingGoal: Joi.number().min(0),
  fundingRaised: Joi.number().min(0),
  currency: Joi.string().valid("USD", "EUR", "GBP", "INR", "CAD", "AUD"),
  status: Joi.string().valid("draft", "active", "hidden", "closed"),
  tags: Joi.array().items(Joi.string().trim().max(30)),
  isFeatured: Joi.boolean(),
  isPublic: Joi.boolean(),
}).unknown(true);

module.exports = { startupCreate, startupUpdate };
