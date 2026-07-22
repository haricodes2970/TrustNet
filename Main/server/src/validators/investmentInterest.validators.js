const Joi = require("joi");

// Statuses staff may set via PUT /:id/status. "submitted" is entry-only
// (never set manually) and "withdrawn" is investor-only (via the dedicated
// withdraw endpoint) — neither is valid here.
const STAFF_SETTABLE_STATUSES = ["reviewing", "contacted", "accepted", "declined"];

const investmentInterestCreate = Joi.object({
  startupId: Joi.string().required(),
  message: Joi.string().trim().max(2000).allow(""),
}).unknown(true);

const statusUpdate = Joi.object({
  status: Joi.string().valid(...STAFF_SETTABLE_STATUSES).required(),
}).unknown(true);

module.exports = { investmentInterestCreate, statusUpdate };
