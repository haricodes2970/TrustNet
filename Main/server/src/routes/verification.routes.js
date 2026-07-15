const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middlewares/auth");
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

router.use(authenticate);
router.get("/", verificationController.getVerification);
router.post("/documents/:type", (req, res, next) => {
  if (!documentTypes.includes(req.params.type)) {
    return next(new ApiError(400, "Unsupported verification document type."));
  }
  return upload.single("document")(req, res, next);
}, verificationController.uploadDocument);
router.post("/submit", verificationController.submitVerification);

module.exports = router;
