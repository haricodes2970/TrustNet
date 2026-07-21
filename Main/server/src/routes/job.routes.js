const express = require("express");
const jobController = require("../controllers/jobController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { jobCreate, jobUpdate } = require("../validators/job.validators");

const router = express.Router();

// Unlike every other collaboration route file, this one does NOT apply
// `router.use(authenticate)` globally — GET / and GET /:id are public
// (published jobs are a public job board), so authenticate is applied
// per-route on the mutation endpoints only.

/**
 * @openapi
 * /jobs:
 *   post:
 *     summary: Create a job posting for a startup (owner/admin only, draft by default)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Job created }
 *       400: { description: Not authorized, validation failure, or salaryMin > salaryMax }
 */
router.post("/", authenticate, validate(jobCreate), jobController.createJob);

/**
 * @openapi
 * /jobs:
 *   get:
 *     summary: List jobs. Public visitors see only published, non-archived jobs; authenticated Startup owners/admins/Team members see all statuses for startups they can access.
 *     tags: [Jobs]
 *     parameters:
 *       - { name: startupId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of jobs }
 */
router.get("/", jobController.listJobs);

/**
 * @openapi
 * /jobs/{id}:
 *   get:
 *     summary: Get a single job. Draft/closed jobs return 404 to anyone without a role on the startup — existence is concealed, not just content.
 *     tags: [Jobs]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job details }
 *       404: { description: Job not found (also returned for unpublished jobs the caller has no access to) }
 */
router.get("/:id", jobController.getJob);

/**
 * @openapi
 * /jobs/{id}:
 *   put:
 *     summary: Update job metadata (owner/admin only; status is not changeable here)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated job }
 */
router.put("/:id", authenticate, validate(jobUpdate), jobController.updateJob);

/**
 * @openapi
 * /jobs/{id}:
 *   delete:
 *     summary: Archive a job (owner/admin only)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job archived }
 */
router.delete("/:id", authenticate, jobController.archiveJob);

/**
 * @openapi
 * /jobs/{id}/publish:
 *   put:
 *     summary: Publish a job (owner/admin only; requires title/description/employmentType/remotePolicy and not archived)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job published }
 *       400: { description: Not authorized, archived, or missing required fields }
 */
router.put("/:id/publish", authenticate, jobController.publishJob);

/**
 * @openapi
 * /jobs/{id}/unpublish:
 *   put:
 *     summary: Revert a published job back to draft (owner/admin only)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job unpublished }
 */
router.put("/:id/unpublish", authenticate, jobController.unpublishJob);

module.exports = router;
