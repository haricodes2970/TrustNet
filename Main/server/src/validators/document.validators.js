const Joi = require("joi");

// Metadata validation only. File/upload validation (mimetype allowlist, size
// cap) is handled by multer's own fileFilter/limits config in
// document.routes.js — same division of labor already used by
// profile.routes.js and verification.routes.js in this repo.

const documentCreate = Joi.object({
  projectId: Joi.string().required(),
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(2000).allow(""),
}).unknown(true);

const documentUpdate = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().max(2000).allow(""),
}).unknown(true);

module.exports = { documentCreate, documentUpdate };
