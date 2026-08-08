const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middlewares/auth");
const { requireVerifiedEmail } = require("../middlewares/verification");
const verificationController = require("../controllers/verificationController");
const ApiError = require("../utils/ApiError");

const router = express.Router();
const documentTypes = ["government_id", "company_registration", "business_website", "linkedin", "startup_registration"];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.mimetype)) {
      return callback(new ApiError(400, "Document must be a JPG, PNG, WebP image, or PDF."));
    }
    return callback(null, true);
  },
});

// Normalizes multer's own error types (MulterError - e.g. an oversized
// file - and the ApiError thrown by fileFilter above) into a clean 400
// through the centralized error handler. Previously, an oversized file's
// MulterError had no `.statusCode`, so errorHandler.js's `err.statusCode
// || 500` fallback turned it into a raw 500 instead of a 400.
function handleUpload(req, res, next) {
  upload.single("document")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "Document file is too large (maximum 10MB)."));
      }
      return next(new ApiError(400, err.message));
    }
    return next(err);
  });
}

router.use(authenticate);
router.get("/", verificationController.getVerification);
router.post(
  "/documents/:type",
  requireVerifiedEmail,
  (req, res, next) => {
    if (!documentTypes.includes(req.params.type)) {
      return next(new ApiError(400, "Unsupported verification document type."));
    }
    return handleUpload(req, res, next);
  },
  verificationController.uploadDocument
);
router.post("/submit", requireVerifiedEmail, verificationController.submitVerification);

module.exports = router;
