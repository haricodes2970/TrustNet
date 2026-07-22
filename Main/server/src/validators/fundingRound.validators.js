const Joi = require("joi");

const ROUND_TYPES = ["pre-seed", "seed", "series-a", "series-b", "series-c", "bridge", "other"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

const fundingRoundCreate = Joi.object({
  startupId: Joi.string().required(),
  title: Joi.string().trim().min(2).max(150).required(),
  roundType: Joi.string().valid(...ROUND_TYPES).required(),
  targetAmount: Joi.number().min(0).required(),
  currency: Joi.string().valid(...CURRENCIES),
  minimumContribution: Joi.number().min(0),
  description: Joi.string().trim().max(2000).allow(""),
}).unknown(true);

// Status changes only via /open, /close, /cancel — no status field here,
// same convention jobUpdate uses to exclude publish-state changes.
const fundingRoundUpdate = Joi.object({
  title: Joi.string().trim().min(2).max(150),
  roundType: Joi.string().valid(...ROUND_TYPES),
  targetAmount: Joi.number().min(0),
  currency: Joi.string().valid(...CURRENCIES),
  minimumContribution: Joi.number().min(0),
  description: Joi.string().trim().max(2000).allow(""),
}).unknown(true);

module.exports = { fundingRoundCreate, fundingRoundUpdate };
