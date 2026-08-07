const express = require("express");
const engagementRequestController = require("../controllers/engagementRequestController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { engagementRequestCreate, statusUpdate } = require("../validators/engagementRequest.validators");

const router = express.Router();

// No public tier at all — every route requires auth.
router.use(authenticate);
// No role list - just populates req.user.role for the platform-admin override.
router.use(authorize());

/**
 * @openapi
 * /engagement-requests:
 *   post:
 *     summary: Request engagement with a published service listing on behalf of a startup (Startup owner/admin only)
 *     tags: [EngagementRequests]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Engagement request submitted }
 *       403: { description: Not authorized to act on behalf of this startup }
 *       404: { description: Service listing not found }
 *       409: { description: Listing not accepting requests, or duplicate active request }
 */
router.post("/", validate(engagementRequestCreate), engagementRequestController.createRequest);

/**
 * @openapi
 * /engagement-requests:
 *   get:
 *     summary: List engagement requests. Startup owner/admin/contributor see all for a startup they explicitly filter by and can access; the owning provider sees all for a listing they explicitly filter by; otherwise scoped to the caller's own submissions.
 *     tags: [EngagementRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: startupId, in: query, required: false, schema: { type: string } }
 *       - { name: serviceListingId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of engagement requests }
 */
router.get("/", engagementRequestController.listRequests);

/**
 * @openapi
 * /engagement-requests/{id}:
 *   get:
 *     summary: Get a single engagement request (the requesting startup's owner/admin/contributor, or the listing's owning provider)
 *     tags: [EngagementRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Engagement request details }
 *       403: { description: Not authorized to view this engagement request }
 */
router.get("/:id", engagementRequestController.getRequest);

/**
 * @openapi
 * /engagement-requests/{id}/status:
 *   put:
 *     summary: Advance an engagement request's status (owning provider only — accept/decline/start/complete)
 *     tags: [EngagementRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Status updated }
 *       409: { description: Invalid status transition, or terminal state }
 */
router.put("/:id/status", validate(statusUpdate), engagementRequestController.updateStatus);

/**
 * @openapi
 * /engagement-requests/{id}/cancel:
 *   put:
 *     summary: Cancel your own startup's engagement request (Startup owner/admin only, from requested or accepted only)
 *     tags: [EngagementRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Engagement request cancelled }
 */
router.put("/:id/cancel", engagementRequestController.cancelRequest);

module.exports = router;
