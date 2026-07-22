const express = require("express");
const aiController = require("../controllers/aiController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { insightRequest } = require("../validators/ai.validators");

const router = express.Router();

// No public tier — every route requires auth.
router.use(authenticate);

/**
 * @openapi
 * /ai/insights:
 *   post:
 *     summary: Generate an AI insight for one of eight capabilities (startup-summary, project-progress, task-prioritization, hiring-insights, funding-summary, marketplace-recommendations, analytics-interpretation, report-explanation). Authorization is entirely inherited from the underlying service each capability calls.
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [capability, startupId]
 *             properties:
 *               capability: { type: string }
 *               startupId: { type: string }
 *               projectId: { type: string, description: "Required for task-prioritization" }
 *               section: { type: string, description: "Required for analytics-interpretation" }
 *               reportType: { type: string, description: "Required for report-explanation" }
 *               question: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: AI insight generated }
 *       400: { description: Invalid capability/section/reportType, or missing a capability-specific field }
 *       403: { description: Not authorized (inherited from the underlying service) }
 *       404: { description: Startup/resource not found (inherited from the underlying service) }
 *       429: { description: Too many AI requests }
 *       502: { description: AI provider is currently unavailable }
 */
router.post("/insights", validate(insightRequest), aiController.generateInsight);

module.exports = router;
