const Joi = require("joi");

const createConversation = Joi.object({
  participants: Joi.array()
    .items(Joi.string().trim().required())
    .min(1)
    .required(),
  type: Joi.string().valid("direct", "group").default("direct"),
  title: Joi.string().trim().max(100).allow(""),
}).unknown(true);

const sendMessage = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  attachments: Joi.array().items(Joi.string().trim().uri()).max(10).default([]),
  replyTo: Joi.string().trim().allow(""),
}).unknown(true);

module.exports = { createConversation, sendMessage };
