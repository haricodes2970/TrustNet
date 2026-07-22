const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

// No public tier — every route requires auth. Every endpoint takes
// ?startupId= as a required query param (not a path param) and returns
// read-only computed data; no request body, so no Joi validator file
// exists for this module.
router.use(authenticate);

/**
 * @openapi
 * /analytics/overview:
 *   get:
 *     summary: Combined analytics summary for a startup (any role — owner/admin/contributor)
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Combined analytics overview }
 *       403: { description: Not authorized to view analytics for this startup }
 *       404: { description: Startup not found }
 */
router.get("/overview", analyticsController.getOverview);

/**
 * @openapi
 * /analytics/projects:
 *   get:
 *     summary: Project and milestone analytics for a startup (any role)
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Project analytics }
 */
router.get("/projects", analyticsController.getProjects);

/**
 * @openapi
 * /analytics/tasks:
 *   get:
 *     summary: Task analytics for a startup (any role)
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task analytics }
 */
router.get("/tasks", analyticsController.getTasks);

/**
 * @openapi
 * /analytics/hiring:
 *   get:
 *     summary: Hiring (Job/Application) analytics for a startup (any role)
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Hiring analytics }
 */
router.get("/hiring", analyticsController.getHiring);

/**
 * @openapi
 * /analytics/funding:
 *   get:
 *     summary: Funding (round/contribution) analytics for a startup (any role)
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding analytics }
 */
router.get("/funding", analyticsController.getFunding);

/**
 * @openapi
 * /analytics/marketplace:
 *   get:
 *     summary: Marketplace (engagement request) analytics for a startup (any role)
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Marketplace analytics }
 */
router.get("/marketplace", analyticsController.getMarketplace);

module.exports = router;
