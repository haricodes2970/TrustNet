const Joi = require("joi");

const profileUpdate = Joi.object({
  fullName: Joi.string().trim().min(2).max(100),
  username: Joi.string().trim().lowercase().min(3).max(30).regex(/^[a-z0-9_]+$/),
  email: Joi.string().trim().lowercase().email(),
  designation: Joi.string().trim().max(100),
  location: Joi.string().trim().max(100),
  website: Joi.string().uri().allow(""),
  linkedin: Joi.string().uri().allow(""),
  bio: Joi.string().trim().max(500).allow(""),
  avatar: Joi.string().uri().allow(""),
  role: Joi.string().valid("founder", "entrepreneur", "investor", "client", "mentor", "builder", "admin"),
  onboardingCompleted: Joi.boolean(),
}).unknown(true);

module.exports = { profileUpdate };