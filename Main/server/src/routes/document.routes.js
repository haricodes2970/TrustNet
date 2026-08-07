const express = require("express");
const multer = require("multer");
const documentController = require("../controllers/documentController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { documentCreate, documentUpdate } = require("../validators/document.validators");
const ApiError = require("../utils/ApiError");

const router = express.Router();

// Mimetype allowlist and size cap are placeholder decisions (no product spec
// given) — same pattern as profile.routes.js/verification.routes.js
// (multer memoryStorage + fileFilter + limits, not Joi). Revisit before
// production if real document-type requirements differ.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
      "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowed.includes(file.mimetype)) {
      return callback(new ApiError(400, "Unsupported document file type."));
    }
    return callback(null, true);
  },
});

router.use(authenticate);
// No role list - just populates req.user.role so controllers can grant a
// platform admin override alongside the existing Workspace-role checks.
router.use(authorize());

/**
 * @openapi
 * /documents:
 *   post:
 *     summary: Upload a document to a project (any workspace member with access)
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               projectId: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               document: { type: string, format: binary }
 *     responses:
 *       201: { description: Document uploaded }
 *       400: { description: Project not found, archived, unsupported file type, or validation failure }
 */
router.post("/", upload.single("document"), validate(documentCreate), documentController.createDocument);

/**
 * @openapi
 * /documents:
 *   get:
 *     summary: List documents the current user can access, optionally filtered by projectId
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: projectId, in: query, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: List of documents }
 */
router.get("/", documentController.listDocuments);

/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     summary: Get a single document, including a freshly-generated download URL (never persisted)
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Document details with download URL }
 *       403: { description: Not authorized to view this document }
 */
router.get("/:id", documentController.getDocument);

/**
 * @openapi
 * /documents/{id}:
 *   put:
 *     summary: Update document metadata (workspace owner/admin, or the uploader)
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated document }
 *       403: { description: Not authorized (no workspace access, or not your document) }
 */
router.put("/:id", validate(documentUpdate), documentController.updateDocument);

/**
 * @openapi
 * /documents/{id}:
 *   delete:
 *     summary: Archive a document (workspace owner/admin, or the uploader)
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Document archived }
 */
router.delete("/:id", documentController.archiveDocument);

/**
 * @openapi
 * /documents/{id}/restore:
 *   post:
 *     summary: Restore an archived document (workspace owner/admin, the uploader, or platform admin)
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Document restored }
 *       409: { description: The parent project is still archived }
 */
router.post("/:id/restore", documentController.restoreDocument);

module.exports = router;
