const Joi = require("joi");

const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship"];
const REMOTE_POLICIES = ["remote", "hybrid", "onsite"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

// Deliberately loose — drafts are allowed to be incomplete. Publish-time
// strictness (title/description/employmentType/remotePolicy required, not
// archived) is a business rule enforced in jobService.assertPublishReady(),
// not here.
const jobCreate = Joi.object({
  startupId: Joi.string().required(),
  title: Joi.string().trim().min(2).max(150).required(),
  department: Joi.string().trim().max(100).allow(""),
  employmentType: Joi.string().valid(...EMPLOYMENT_TYPES),
  location: Joi.string().trim().max(100).allow(""),
  remotePolicy: Joi.string().valid(...REMOTE_POLICIES),
  salaryMin: Joi.number().min(0),
  salaryMax: Joi.number().min(0),
  currency: Joi.string().valid(...CURRENCIES),
  description: Joi.string().trim().allow(""),
  requirements: Joi.array().items(Joi.string().trim().max(200)).max(20),
}).unknown(true);

// No `status` — status changes only via the dedicated publish/unpublish
// endpoints, never through a general metadata update.
const jobUpdate = Joi.object({
  title: Joi.string().trim().min(2).max(150),
  department: Joi.string().trim().max(100).allow(""),
  employmentType: Joi.string().valid(...EMPLOYMENT_TYPES),
  location: Joi.string().trim().max(100).allow(""),
  remotePolicy: Joi.string().valid(...REMOTE_POLICIES),
  salaryMin: Joi.number().min(0),
  salaryMax: Joi.number().min(0),
  currency: Joi.string().valid(...CURRENCIES),
  description: Joi.string().trim().allow(""),
  requirements: Joi.array().items(Joi.string().trim().max(200)).max(20),
}).unknown(true);

module.exports = { jobCreate, jobUpdate };
