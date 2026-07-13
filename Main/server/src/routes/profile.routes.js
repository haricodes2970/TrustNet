const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const profileController = require("../controllers/profileController");
const { profileUpdate } = require("../validators/profile.validators");
const ApiError = require("../utils/ApiError");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(new ApiError(400, "Avatar must be a JPG, PNG, or WebP image."));
    }
    return callback(null, true);
  },
});
router.use(authenticate);
router.get("/", profileController.getProfile);
router.put("/", validate(profileUpdate), profileController.updateProfile);
router.post("/avatar", upload.single("avatar"), profileController.uploadAvatar);
router.delete("/avatar", profileController.removeAvatar);

module.exports = router;
