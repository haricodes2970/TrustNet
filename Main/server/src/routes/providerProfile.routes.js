const express = require("express");
const providerProfileController = require("../controllers/providerProfileController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { providerProfileCreate, providerProfileUpdate } = require("../validators/providerProfile.validators");

const router = express.Router();

// GET / and GET /:id are public (provider directory) — authenticate is
// applied per-route on the mutation endpoints only, same shape as
// investor.routes.js.

/**
 * @openapi
 * /provider-profiles:
 *   post:
 *     summary: Create your own provider profile (one per user)
 *     tags: [ProviderProfiles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Provider profile created }
 *       409: { description: Profile already exists }
 */
router.post("/", authenticate, validate(providerProfileCreate), providerProfileController.createProfile);

/**
 * @openapi
 * /provider-profiles:
 *   get:
 *     summary: List provider profiles (public directory)
 *     tags: [ProviderProfiles]
 *     responses:
 *       200: { description: List of provider profiles }
 */
router.get("/", providerProfileController.listProfiles);

/**
 * @openapi
 * /provider-profiles/{id}:
 *   get:
 *     summary: Get a single provider profile (public)
 *     tags: [ProviderProfiles]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Provider profile details }
 *       404: { description: Not found }
 */
router.get("/:id", providerProfileController.getProfile);

/**
 * @openapi
 * /provider-profiles/{id}:
 *   put:
 *     summary: Update your own provider profile
 *     tags: [ProviderProfiles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated provider profile }
 */
router.put("/:id", authenticate, validate(providerProfileUpdate), providerProfileController.updateProfile);

module.exports = router;
