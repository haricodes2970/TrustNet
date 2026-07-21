const Joi = require("joi");

// Statuses a staff member may set via PUT /:id/status. "submitted" is the
// only entry state (never set manually) and "withdrawn" is candidate-only
// (via the dedicated withdraw endpoint) — neither is valid here.
const STAFF_SETTABLE_STATUSES = ["under_review", "interview", "offer", "hired", "rejected"];

const applicationCreate = Joi.object({
  jobId: Joi.string().required(),
  coverLetter: Joi.string().trim().max(5000).allow(""),
}).unknown(true);

const coverLetterUpdate = Joi.object({
  coverLetter: Joi.string().trim().max(5000).allow("").required(),
}).unknown(true);

const statusUpdate = Joi.object({
  status: Joi.string().valid(...STAFF_SETTABLE_STATUSES),
  notes: Joi.string().trim().max(4000).allow(""),
})
  .or("status", "notes")
  .unknown(true);

module.exports = { applicationCreate, coverLetterUpdate, statusUpdate };
