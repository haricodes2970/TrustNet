const Joi = require("joi");

const POST_TYPES = ["discussion", "announcement", "update", "pitch", "question"];
const VISIBILITY = ["public", "community", "private"];

// No validator existed for Post at all before this phase - creation went
// straight from req.body to Mongoose with no shape/type checking beyond
// what the schema itself enforces (which still runs, but a malformed
// request previously surfaced as a raw Mongoose ValidationError instead of
// a clean 400).
const postCreate = Joi.object({
  title: Joi.string().trim().max(150).allow(""),
  content: Joi.string().trim().min(1).max(12000).required(),
  community: Joi.string().allow(null),
  startup: Joi.string().allow(null),
  postType: Joi.string().valid(...POST_TYPES),
  images: Joi.array().items(Joi.string().trim()).max(10),
  videoUrl: Joi.string().trim().uri().allow(""),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(20),
  visibility: Joi.string().valid(...VISIBILITY),
}).unknown(true);

// No `author`/`likes`/`likeCount`/`commentCount`/`isHidden`/`deletedAt` -
// none of these are ever settable through a plain update; the service layer
// also strips them defensively even if a caller tries.
const postUpdate = Joi.object({
  title: Joi.string().trim().max(150).allow(""),
  content: Joi.string().trim().min(1).max(12000),
  postType: Joi.string().valid(...POST_TYPES),
  images: Joi.array().items(Joi.string().trim()).max(10),
  videoUrl: Joi.string().trim().uri().allow(""),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(20),
  visibility: Joi.string().valid(...VISIBILITY),
  isPinned: Joi.boolean(),
}).unknown(true);

module.exports = { postCreate, postUpdate };
