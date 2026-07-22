const express = require("express");
const fundingContributionController = require("../controllers/fundingContributionController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { fundingContributionCreate } = require("../validators/fundingContribution.validators");

const router = express.Router();

// No public tier at all, unlike funding-rounds — every route requires auth.
router.use(authenticate);

/**
 * @openapi
 * /funding-contributions:
 *   post:
 *     summary: Pledge a contribution to an open funding round (any authenticated user)
 *     tags: [FundingContributions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Contribution pledged }
 *       403: { description: Account not active }
 *       404: { description: Funding round not found }
 *       409: { description: Round not open, or currency mismatch }
 */
router.post("/", validate(fundingContributionCreate), fundingContributionController.createContribution);

/**
 * @openapi
 * /funding-contributions:
 *   get:
 *     summary: List contributions. Investors see only their own; Startup owner/admin/contributor see all for a round they explicitly filter by and can access.
 *     tags: [FundingContributions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: fundingRoundId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of contributions }
 */
router.get("/", fundingContributionController.listContributions);

/**
 * @openapi
 * /funding-contributions/{id}:
 *   get:
 *     summary: Get a single contribution (the investor, or the round's startup owner/admin/contributor)
 *     tags: [FundingContributions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Contribution details }
 *       403: { description: Not authorized to view this contribution }
 */
router.get("/:id", fundingContributionController.getContribution);

/**
 * @openapi
 * /funding-contributions/{id}/confirm:
 *   put:
 *     summary: Confirm a pledged contribution (Startup owner/admin only). Atomically increments FundingRound.raisedAmount and Startup.fundingRaised.
 *     tags: [FundingContributions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Contribution confirmed }
 *       409: { description: Not pledged, or terminal state }
 */
router.put("/:id/confirm", fundingContributionController.confirmContribution);

/**
 * @openapi
 * /funding-contributions/{id}/reject:
 *   put:
 *     summary: Reject a pledged contribution (Startup owner/admin only)
 *     tags: [FundingContributions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Contribution rejected }
 */
router.put("/:id/reject", fundingContributionController.rejectContribution);

/**
 * @openapi
 * /funding-contributions/{id}/withdraw:
 *   put:
 *     summary: Withdraw your own pledged contribution (investor only)
 *     tags: [FundingContributions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Contribution withdrawn }
 */
router.put("/:id/withdraw", fundingContributionController.withdraw);

module.exports = router;
