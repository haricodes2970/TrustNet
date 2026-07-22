const Joi = require("joi");

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

const fundingContributionCreate = Joi.object({
  fundingRoundId: Joi.string().required(),
  amount: Joi.number().greater(0).required(),
  currency: Joi.string().valid(...CURRENCIES).required(),
  note: Joi.string().trim().max(2000).allow(""),
}).unknown(true);

module.exports = { fundingContributionCreate };
