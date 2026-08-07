const express = require("express");
const serviceListingController = require("../controllers/serviceListingController");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { serviceListingCreate, serviceListingUpdate } = require("../validators/serviceListing.validators");

const router = express.Router();

// Like job.routes.js, this file does NOT apply `router.use(authenticate)`
// globally — GET / and GET /:id are public (published listings are a
// public marketplace), so authenticate is applied per-route on the
// mutation endpoints only. GET / and GET /:id use optionalAuthenticate so
// an authenticated owner/admin sees more than the public subset (previously
// unreachable — tracked in BACKLOG.md, same fix already applied to Job and
// FundingRound).

/**
 * @openapi
 * /service-listings:
 *   post:
 *     summary: Create a service listing (requires an existing provider profile, draft by default)
 *     tags: [ServiceListings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Service listing created }
 *       409: { description: No provider profile exists, or priceMin > priceMax }
 */
router.post(
  "/",
  authenticate,
  authorize(),
  validate(serviceListingCreate),
  serviceListingController.createListing
);

/**
 * @openapi
 * /service-listings:
 *   get:
 *     summary: List service listings. Public visitors see only published, non-archived listings; the owning provider sees all statuses for their own profile.
 *     tags: [ServiceListings]
 *     parameters:
 *       - { name: providerId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of service listings }
 */
router.get("/", optionalAuthenticate, serviceListingController.listListings);

/**
 * @openapi
 * /service-listings/{id}:
 *   get:
 *     summary: Get a single service listing. Draft/archived listings return 404 to anyone but the owning provider — existence is concealed, not just content.
 *     tags: [ServiceListings]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Service listing details }
 *       404: { description: Listing not found (also returned for non-published listings the caller does not own) }
 */
router.get("/:id", optionalAuthenticate, serviceListingController.getListing);

/**
 * @openapi
 * /service-listings/{id}:
 *   put:
 *     summary: Update listing metadata (owning provider only; status is not changeable here)
 *     tags: [ServiceListings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated service listing }
 */
router.put(
  "/:id",
  authenticate,
  authorize(),
  validate(serviceListingUpdate),
  serviceListingController.updateListing
);

/**
 * @openapi
 * /service-listings/{id}:
 *   delete:
 *     summary: Archive a service listing (owning provider only)
 *     tags: [ServiceListings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Service listing archived }
 */
router.delete("/:id", authenticate, authorize(), serviceListingController.archiveListing);

/**
 * @openapi
 * /service-listings/{id}/restore:
 *   post:
 *     summary: Restore an archived service listing (owning provider or platform admin only; blocked if removed by admin moderation)
 *     tags: [ServiceListings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Service listing restored }
 *       409: { description: Removed by a platform administrator, cannot self-restore }
 */
router.post("/:id/restore", authenticate, authorize(), serviceListingController.restoreListing);

/**
 * @openapi
 * /service-listings/{id}/publish:
 *   put:
 *     summary: Publish a listing (owning provider only; requires title/description/category/pricingModel and not archived)
 *     tags: [ServiceListings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Service listing published }
 *       409: { description: Archived, or missing required fields }
 */
router.put("/:id/publish", authenticate, authorize(), serviceListingController.publishListing);

/**
 * @openapi
 * /service-listings/{id}/unpublish:
 *   put:
 *     summary: Revert a published listing back to draft (owning provider only)
 *     tags: [ServiceListings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Service listing unpublished }
 */
router.put("/:id/unpublish", authenticate, authorize(), serviceListingController.unpublishListing);

module.exports = router;
