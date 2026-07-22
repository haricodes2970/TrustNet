const Joi = require("joi");

// Statuses the provider may set via PUT /:id/status. "requested" is
// entry-only (never set manually) and "cancelled" is startup-only (via the
// dedicated cancel endpoint) — neither is valid here.
const PROVIDER_SETTABLE_STATUSES = ["accepted", "declined", "in_progress", "completed"];

const engagementRequestCreate = Joi.object({
  serviceListingId: Joi.string().required(),
  startupId: Joi.string().required(),
  message: Joi.string().trim().max(2000).allow(""),
}).unknown(true);

const statusUpdate = Joi.object({
  status: Joi.string().valid(...PROVIDER_SETTABLE_STATUSES).required(),
}).unknown(true);

module.exports = { engagementRequestCreate, statusUpdate };
