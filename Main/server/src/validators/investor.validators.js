const Joi = require("joi");

const STAGES = ["idea", "validation", "early-stage", "growth", "established"];

const investorProfileCreate = Joi.object({
  organization: Joi.string().trim().max(150).allow(""),
  investmentThesis: Joi.string().trim().max(2000).allow(""),
  preferredStages: Joi.array().items(Joi.string().valid(...STAGES)).max(10),
  preferredIndustries: Joi.array().items(Joi.string().trim().max(50)).max(20),
  preferredRegions: Joi.array().items(Joi.string().trim().max(100)).max(20),
}).unknown(true);

const investorProfileUpdate = investorProfileCreate;

module.exports = { investorProfileCreate, investorProfileUpdate };
