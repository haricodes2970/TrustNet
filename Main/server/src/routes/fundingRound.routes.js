const express = require("express");
const fundingRoundController = require("../controllers/fundingRoundController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { fundingRoundCreate, fundingRoundUpdate } = require("../validators/fundingRound.validators");

const router = express.Router();

// Like job.routes.js, this file does NOT apply `router.use(authenticate)`
// globally — GET / and GET /:id are public (open rounds are visible to
// anyone), so authenticate is applied per-route on the mutation endpoints
// only. Same known limitation as Job: with no optional-auth middleware in
// this codebase, req.user is unset on these two routes today, so the
// "authenticated caller sees rounds on startups they manage" branch in the
// service is unreachable until that gap is addressed (see BACKLOG.md).

/**
 * @openapi
 * /funding-rounds:
 *   post:
 *     summary: Create a funding round for a startup (owner/admin only, draft by default)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Funding round created }
 *       403: { description: Not authorized }
 *       404: { description: Startup not found }
 */
router.post("/", authenticate, validate(fundingRoundCreate), fundingRoundController.createRound);

/**
 * @openapi
 * /funding-rounds:
 *   get:
 *     summary: List funding rounds. Public visitors see only open, non-archived rounds; authenticated Startup owners/admins/Team members see all statuses for startups they can access.
 *     tags: [FundingRounds]
 *     parameters:
 *       - { name: startupId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of funding rounds }
 */
router.get("/", fundingRoundController.listRounds);

/**
 * @openapi
 * /funding-rounds/{id}:
 *   get:
 *     summary: Get a single funding round. Non-open rounds return 404 to anyone without a role on the startup — existence is concealed, not just content.
 *     tags: [FundingRounds]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round details }
 *       404: { description: Funding round not found (also returned for non-open rounds the caller has no access to) }
 */
router.get("/:id", fundingRoundController.getRound);

/**
 * @openapi
 * /funding-rounds/{id}:
 *   put:
 *     summary: Update a funding round (owner/admin only, draft rounds only)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated funding round }
 *       409: { description: Round is not in draft state }
 */
router.put("/:id", authenticate, validate(fundingRoundUpdate), fundingRoundController.updateRound);

/**
 * @openapi
 * /funding-rounds/{id}/open:
 *   put:
 *     summary: Open a draft funding round for contributions (owner/admin only; startup must be active)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round opened }
 *       409: { description: Invalid transition, or startup not active }
 */
router.put("/:id/open", authenticate, fundingRoundController.openRound);

/**
 * @openapi
 * /funding-rounds/{id}/close:
 *   put:
 *     summary: Close an open funding round (owner/admin only)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round closed }
 */
router.put("/:id/close", authenticate, fundingRoundController.closeRound);

/**
 * @openapi
 * /funding-rounds/{id}/cancel:
 *   put:
 *     summary: Cancel a draft or open funding round (owner/admin only)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round cancelled }
 */
router.put("/:id/cancel", authenticate, fundingRoundController.cancelRound);

module.exports = router;
