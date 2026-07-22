const Joi = require("joi");

const PRICING_MODELS = ["fixed", "hourly", "retainer", "custom"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

// Deliberately loose — drafts are allowed to be incomplete. Publish-time
// strictness (title/description/category/pricingModel required, not
// archived) is a business rule enforced in
// serviceListingService.assertPublishReady(), not here.
const serviceListingCreate = Joi.object({
  title: Joi.string().trim().min(2).max(150).required(),
  category: Joi.string().trim().max(50).required(),
  description: Joi.string().trim().max(5000).allow(""),
  pricingModel: Joi.string().valid(...PRICING_MODELS),
  priceMin: Joi.number().min(0),
  priceMax: Joi.number().min(0),
  currency: Joi.string().valid(...CURRENCIES),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(20),
}).unknown(true);

// No `status` — status changes only via the dedicated publish/unpublish
// endpoints, never through a general metadata update.
const serviceListingUpdate = Joi.object({
  title: Joi.string().trim().min(2).max(150),
  category: Joi.string().trim().max(50),
  description: Joi.string().trim().max(5000).allow(""),
  pricingModel: Joi.string().valid(...PRICING_MODELS),
  priceMin: Joi.number().min(0),
  priceMax: Joi.number().min(0),
  currency: Joi.string().valid(...CURRENCIES),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(20),
}).unknown(true);

module.exports = { serviceListingCreate, serviceListingUpdate };
