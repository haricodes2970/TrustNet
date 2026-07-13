const Joi = require("joi");

const comment = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
});

module.exports = { comment };
