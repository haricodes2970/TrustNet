const Joi = require("joi");

const CAPABILITIES = [
  "startup-summary",
  "project-progress",
  "task-prioritization",
  "hiring-insights",
  "funding-summary",
  "marketplace-recommendations",
  "analytics-interpretation",
  "report-explanation",
];
const ANALYTICS_SECTIONS = ["overview", "projects", "tasks", "hiring", "funding", "marketplace"];
const REPORT_TYPES = ["startup", "projects", "tasks", "hiring", "funding", "marketplace"];

// capability lives in the request body (not a path param) so this schema
// can validate the capability-specific conditional fields (projectId/
// section/reportType) via Joi's .when() against a sibling field — the
// `validate` middleware only ever inspects req.body.
const insightRequest = Joi.object({
  capability: Joi.string().valid(...CAPABILITIES).required(),
  startupId: Joi.string().required(),
  projectId: Joi.string().when("capability", {
    is: "task-prioritization",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  section: Joi.string()
    .valid(...ANALYTICS_SECTIONS)
    .when("capability", {
      is: "analytics-interpretation",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  reportType: Joi.string()
    .valid(...REPORT_TYPES)
    .when("capability", {
      is: "report-explanation",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  question: Joi.string().trim().max(500).allow(""),
}).unknown(true);

module.exports = { insightRequest };
