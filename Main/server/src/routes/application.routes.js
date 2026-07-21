const express = require("express");
const multer = require("multer");
const applicationController = require("../controllers/applicationController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  applicationCreate,
  coverLetterUpdate,
  statusUpdate,
} = require("../validators/application.validators");
const ApiError = require("../utils/ApiError");

const router = express.Router();

// Resume-appropriate types only, smaller cap than Documents' 20MB (resumes
// are small text-heavy files) — placeholder decision, no product spec
// given, same caveat as every prior file-upload route in this repo.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.mimetype)) {
      return callback(new ApiError(400, "Resume must be a PDF or Word document."));
    }
    return callback(null, true);
  },
});

// No public tier at all (unlike job.routes.js) — every route requires auth.
router.use(authenticate);

/**
 * @openapi
 * /applications:
 *   post:
 *     summary: Submit an application to a published job (any authenticated user)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jobId: { type: string }
 *               coverLetter: { type: string }
 *               resume: { type: string, format: binary }
 *     responses:
 *       201: { description: Application submitted }
 *       400: { description: Job not accepting applications, duplicate application, or validation failure }
 */
router.post("/", upload.single("resume"), validate(applicationCreate), applicationController.createApplication);

/**
 * @openapi
 * /applications:
 *   get:
 *     summary: List applications. Candidates see only their own; Startup owner/admin see all for a job they explicitly filter by and manage.
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: jobId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of applications (notes redacted for candidates) }
 */
router.get("/", applicationController.listApplications);

/**
 * @openapi
 * /applications/{id}:
 *   get:
 *     summary: Get a single application (the applicant, or the job's Startup owner/admin — notes redacted for the applicant)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Application details }
 *       403: { description: Not authorized to view this application }
 */
router.get("/:id", applicationController.getApplication);

/**
 * @openapi
 * /applications/{id}/resume:
 *   put:
 *     summary: Replace the resume (applicant only, only while status is "submitted")
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume: { type: string, format: binary }
 *     responses:
 *       200: { description: Resume updated }
 */
router.put("/:id/resume", upload.single("resume"), applicationController.updateResume);

/**
 * @openapi
 * /applications/{id}/cover-letter:
 *   put:
 *     summary: Update the cover letter (applicant only, only while status is "submitted")
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Cover letter updated }
 */
router.put("/:id/cover-letter", validate(coverLetterUpdate), applicationController.updateCoverLetter);

/**
 * @openapi
 * /applications/{id}/status:
 *   put:
 *     summary: Update application status and/or add internal notes (Startup owner/admin only)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Application status/notes updated }
 *       400: { description: Not authorized, or invalid status transition }
 */
router.put("/:id/status", validate(statusUpdate), applicationController.updateStatus);

/**
 * @openapi
 * /applications/{id}/withdraw:
 *   put:
 *     summary: Withdraw an application (applicant only, from any non-terminal state)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Application withdrawn }
 */
router.put("/:id/withdraw", applicationController.withdraw);

module.exports = router;
