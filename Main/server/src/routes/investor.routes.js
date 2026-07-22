const express = require("express");
const investorController = require("../controllers/investorController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { investorProfileCreate, investorProfileUpdate } = require("../validators/investor.validators");

const router = express.Router();

// GET / and GET /:id are public (investor directory) — authenticate is
// applied per-route on the mutation endpoints only, same shape as
// job.routes.js.

/**
 * @openapi
 * /investors:
 *   post:
 *     summary: Create your own investor profile (one per user)
 *     tags: [Investors]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Investor profile created }
 *       400: { description: Profile already exists, or validation failure }
 */
router.post("/", authenticate, validate(investorProfileCreate), investorController.createProfile);

/**
 * @openapi
 * /investors:
 *   get:
 *     summary: List investor profiles (public directory)
 *     tags: [Investors]
 *     responses:
 *       200: { description: List of investor profiles }
 */
router.get("/", investorController.listProfiles);

/**
 * @openapi
 * /investors/{id}:
 *   get:
 *     summary: Get a single investor profile (public)
 *     tags: [Investors]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Investor profile details }
 *       404: { description: Not found }
 */
router.get("/:id", investorController.getProfile);

/**
 * @openapi
 * /investors/{id}:
 *   put:
 *     summary: Update your own investor profile
 *     tags: [Investors]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated investor profile }
 */
router.put("/:id", authenticate, validate(investorProfileUpdate), investorController.updateProfile);

module.exports = router;
