const Joi = require("joi");

// `sender` and `status` are deliberately absent: sender is always derived
// from the authenticated user in the service layer, and a new request
// always starts "pending". Both were client-settable before Phase 17.
const collaborationRequestCreate = Joi.object({
  recipient: Joi.string().required(),
  startup: Joi.string().allow(null, ""),
  type: Joi.string().valid("mentorship", "funding", "partnership", "advisor", "other"),
  subject: Joi.string().trim().max(150).allow(""),
  message: Joi.string().trim().min(10).max(5000).required(),
}).unknown(true);

const collaborationRequestUpdate = Joi.object({
  status: Joi.string().valid("accepted", "rejected", "withdrawn").required(),
  responseMessage: Joi.string().trim().max(4000).allow(""),
}).unknown(true);

module.exports = { collaborationRequestCreate, collaborationRequestUpdate };
