const express = require("express");
const fundingRoundController = require("../controllers/fundingRoundController");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { fundingRoundCreate, fundingRoundUpdate } = require("../validators/fundingRound.validators");

const router = express.Router();

// Like job.routes.js, this file does NOT apply `router.use(authenticate)`
// globally — GET / and GET /:id are public (open rounds are visible to
// anyone), so authenticate is applied per-route on the mutation endpoints
// only. optionalAuthenticate (Startup/Job's public-read pattern, reused
// here) now populates req.user on these two routes when a valid token is
// present, without rejecting anonymous callers — closes the gap this file
// used to document as a standing BACKLOG.md limitation ("no optional-auth
// middleware exists"); it now does, and both Startup and Job already use
// it. authorize() (no role list) just populates req.user.role for the
// platform-admin override, run after authenticate on every mutation.

/**
 * @openapi
 * /funding-rounds:
 *   post:
 *     summary: Create a funding round for a startup (owner/admin, or platform admin; draft by default)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Funding round created }
 *       403: { description: Not authorized }
 *       404: { description: Startup not found }
 *       409: { description: Startup deleted }
 */
router.post("/", authenticate, authorize(), validate(fundingRoundCreate), fundingRoundController.createRound);

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
router.get("/", optionalAuthenticate, fundingRoundController.listRounds);

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
router.get("/:id", optionalAuthenticate, fundingRoundController.getRound);

/**
 * @openapi
 * /funding-rounds/{id}:
 *   put:
 *     summary: Update a funding round (owner/admin, or platform admin; draft rounds only)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated funding round }
 *       409: { description: Round is not in draft state, or is archived }
 */
router.put("/:id", authenticate, authorize(), validate(fundingRoundUpdate), fundingRoundController.updateRound);

/**
 * @openapi
 * /funding-rounds/{id}/open:
 *   put:
 *     summary: Open a draft funding round for contributions (owner/admin, or platform admin; startup must be active, not suspended, not deleted)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round opened }
 *       409: { description: Invalid transition, or startup not active/suspended/deleted }
 */
router.put("/:id/open", authenticate, authorize(), fundingRoundController.openRound);

/**
 * @openapi
 * /funding-rounds/{id}/close:
 *   put:
 *     summary: Close an open funding round (owner/admin, or platform admin)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round closed }
 */
router.put("/:id/close", authenticate, authorize(), fundingRoundController.closeRound);

/**
 * @openapi
 * /funding-rounds/{id}/cancel:
 *   put:
 *     summary: Cancel a draft or open funding round (owner/admin, or platform admin)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round cancelled }
 */
router.put("/:id/cancel", authenticate, authorize(), fundingRoundController.cancelRound);

/**
 * @openapi
 * /funding-rounds/{id}:
 *   delete:
 *     summary: Archive a funding round (owner/admin, or platform admin)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round archived }
 */
router.delete("/:id", authenticate, authorize(), fundingRoundController.archiveRound);

/**
 * @openapi
 * /funding-rounds/{id}/restore:
 *   post:
 *     summary: Restore an archived funding round (owner/admin, or platform admin)
 *     tags: [FundingRounds]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Funding round restored }
 *       409: { description: The startup is still deleted }
 */
router.post("/:id/restore", authenticate, authorize(), fundingRoundController.restoreRound);

module.exports = router;
