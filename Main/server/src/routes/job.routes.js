const express = require("express");
const jobController = require("../controllers/jobController");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { jobCreate, jobUpdate } = require("../validators/job.validators");

const router = express.Router();

// Unlike every other collaboration route file, this one does NOT apply
// `router.use(authenticate)` globally — GET / and GET /:id are public
// (published jobs are a public job board), so authenticate is applied
// per-route on the mutation endpoints only. optionalAuthenticate (Startup
// module's public-read pattern, reused here) lets an authenticated caller's
// role be known on the public GETs too, without rejecting anonymous ones -
// needed so a platform admin's override is honored on the read side, not
// just mutations. authorize() (no role list) just populates req.user.role
// for the platform-admin override, run after authenticate on every
// protected mutation.

/**
 * @openapi
 * /jobs:
 *   post:
 *     summary: Create a job posting for a startup (owner/admin, or platform admin; draft by default)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Job created }
 *       404: { description: Startup not found }
 *       409: { description: Startup deleted }
 */
router.post("/", authenticate, authorize(), validate(jobCreate), jobController.createJob);

/**
 * @openapi
 * /jobs:
 *   get:
 *     summary: List jobs. Public visitors see only published, non-archived jobs; authenticated Startup owners/admins/Team members see all statuses for startups they can access; platform admin filterable/status/search/paginated.
 *     tags: [Jobs]
 *     parameters:
 *       - { name: startupId, in: query, required: false, schema: { type: string } }
 *       - { name: status, in: query, required: false, schema: { type: string } }
 *       - { name: search, in: query, required: false, schema: { type: string } }
 *       - { name: limit, in: query, required: false, schema: { type: integer } }
 *       - { name: skip, in: query, required: false, schema: { type: integer } }
 *     responses:
 *       200: { description: List of jobs }
 */
router.get("/", optionalAuthenticate, jobController.listJobs);

/**
 * @openapi
 * /jobs/{id}:
 *   get:
 *     summary: Get a single job. Draft/closed/hidden/deleted jobs return 404 to anyone without a role on the startup — existence is concealed, not just content.
 *     tags: [Jobs]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job details }
 *       404: { description: Job not found (also returned for unpublished jobs the caller has no access to) }
 */
router.get("/:id", optionalAuthenticate, jobController.getJob);

/**
 * @openapi
 * /jobs/{id}:
 *   put:
 *     summary: Update job metadata (owner/admin, or platform admin; status is not changeable here)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated job }
 *       409: { description: Job is archived }
 */
router.put("/:id", authenticate, authorize(), validate(jobUpdate), jobController.updateJob);

/**
 * @openapi
 * /jobs/{id}:
 *   delete:
 *     summary: Archive a job (owner/admin, or platform admin)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job archived }
 */
router.delete("/:id", authenticate, authorize(), jobController.archiveJob);

/**
 * @openapi
 * /jobs/{id}/restore:
 *   post:
 *     summary: Restore an archived job (owner/admin, or platform admin)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job restored }
 *       409: { description: The startup is still deleted }
 */
router.post("/:id/restore", authenticate, authorize(), jobController.restoreJob);

/**
 * @openapi
 * /jobs/{id}/publish:
 *   put:
 *     summary: Publish a job (owner/admin, or platform admin; requires title/description/employmentType/remotePolicy and not archived)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job published }
 *       409: { description: Archived, or missing required fields }
 */
router.put("/:id/publish", authenticate, authorize(), jobController.publishJob);

/**
 * @openapi
 * /jobs/{id}/unpublish:
 *   put:
 *     summary: Revert a published job back to draft (owner/admin, or platform admin)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job unpublished }
 */
router.put("/:id/unpublish", authenticate, authorize(), jobController.unpublishJob);

/**
 * @openapi
 * /jobs/{id}/close:
 *   put:
 *     summary: Close a job (position filled/cancelled - owner/admin, or platform admin)
 *     tags: [Jobs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Job closed }
 */
router.put("/:id/close", authenticate, authorize(), jobController.closeJob);

module.exports = router;
