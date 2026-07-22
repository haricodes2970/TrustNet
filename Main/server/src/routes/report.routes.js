const express = require("express");
const reportController = require("../controllers/reportController");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

// No public tier — every route requires auth. No Joi validator file:
// reportType/format/startupId are all validated inside reportService,
// same reasoning as analytics.routes.js (no request body on any GET here).
router.use(authenticate);

/**
 * @openapi
 * /reports/{reportType}:
 *   get:
 *     summary: Generate an exportable report for a startup (owner/admin only — contributor gets 403)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: reportType, in: path, required: true, schema: { type: string, enum: [startup, projects, tasks, hiring, funding, marketplace] } }
 *       - { name: startupId, in: query, required: true, schema: { type: string } }
 *       - { name: format, in: query, required: false, schema: { type: string, enum: [json, csv], default: json } }
 *     responses:
 *       200: { description: "Report (JSON envelope for format=json, text/csv attachment for format=csv)" }
 *       400: { description: Invalid reportType/format, or missing startupId }
 *       403: { description: Not authorized (contributor or unrelated user) }
 *       404: { description: Startup not found }
 */
router.get("/:reportType", reportController.getReport);

module.exports = router;
