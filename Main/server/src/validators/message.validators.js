const Joi = require("joi");

const OBJECT_ID = Joi.string().trim().hex().length(24);

const createConversation = Joi.object({
  participants: Joi.array()
    .items(OBJECT_ID.required())
    .min(1)
    .required(),
  type: Joi.string().valid("direct", "group").default("direct"),
  title: Joi.string().trim().max(100).allow(""),
}).unknown(true);

const sendMessage = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  attachments: Joi.array().items(Joi.string().trim().uri()).max(10).default([]),
  replyTo: OBJECT_ID.allow(""),
}).unknown(true);

// Same content shape as sendMessage - editing never touches
// attachments/replyTo, only the text body.
const editMessage = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
}).unknown(true);

module.exports = { createConversation, sendMessage, editMessage };
