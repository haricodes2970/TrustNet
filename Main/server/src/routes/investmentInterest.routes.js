const express = require("express");
const investmentInterestController = require("../controllers/investmentInterestController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { investmentInterestCreate, statusUpdate } = require("../validators/investmentInterest.validators");

const router = express.Router();

// No public tier at all, unlike investor.routes.js — every route requires auth.
router.use(authenticate);

/**
 * @openapi
 * /investment-interests:
 *   post:
 *     summary: Express investment interest in a startup (any authenticated user)
 *     tags: [InvestmentInterests]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Interest submitted }
 *       400: { description: Startup not accepting interest, inactive account, duplicate interest, or validation failure }
 */
router.post("/", validate(investmentInterestCreate), investmentInterestController.createInterest);

/**
 * @openapi
 * /investment-interests:
 *   get:
 *     summary: List investment interests. Investors see only their own; Startup owner/admin/contributor see all for a startup they explicitly filter by and can access.
 *     tags: [InvestmentInterests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of investment interests }
 */
router.get("/", investmentInterestController.listInterests);

/**
 * @openapi
 * /investment-interests/{id}:
 *   get:
 *     summary: Get a single investment interest (the investor, or the startup's owner/admin/contributor)
 *     tags: [InvestmentInterests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Investment interest details }
 *       403: { description: Not authorized to view this investment interest }
 */
router.get("/:id", investmentInterestController.getInterest);

/**
 * @openapi
 * /investment-interests/{id}/status:
 *   put:
 *     summary: Update investment interest status (Startup owner/admin only — contributor is read-only)
 *     tags: [InvestmentInterests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Not authorized, or invalid status transition }
 */
router.put("/:id/status", validate(statusUpdate), investmentInterestController.updateStatus);

/**
 * @openapi
 * /investment-interests/{id}:
 *   delete:
 *     summary: Archive an investment interest (Startup owner/admin only — contributor is read-only)
 *     tags: [InvestmentInterests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Investment interest archived }
 */
router.delete("/:id", investmentInterestController.archiveInterest);

/**
 * @openapi
 * /investment-interests/{id}/withdraw:
 *   put:
 *     summary: Withdraw your own investment interest (from any non-terminal state)
 *     tags: [InvestmentInterests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Investment interest withdrawn }
 */
router.put("/:id/withdraw", investmentInterestController.withdraw);

module.exports = router;
