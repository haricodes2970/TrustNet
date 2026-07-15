const User = require("../models/User");
const cloudinary = require("../services/cloudinary.service");
const ApiError = require("../utils/ApiError");

const REQUIRED_DOCUMENT_TYPES = ["government_id", "company_registration", "business_website", "linkedin"];

function serializeVerification(user) {
  return {
    status: user.verificationStatus || "draft",
    submittedAt: user.verificationSubmittedAt || null,
    reviewedAt: user.verificationReviewedAt || null,
    documents: (user.verificationDocuments || []).map((document) => ({
      type: document.type,
      name: document.name,
      url: document.url,
      status: document.status,
      rejectionReason: document.rejectionReason || "",
      uploadedAt: document.uploadedAt,
    })),
  };
}

async function getVerification(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");

    return res.json({ success: true, data: serializeVerification(user) });
  } catch (error) {
    return next(error);
  }
}

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, "No document file provided.");

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");
    if (["pending", "approved"].includes(user.verificationStatus)) {
      throw new ApiError(400, "Documents cannot be changed while verification is under review or approved.");
    }

    const type = req.params.type;
    const publicId = `verification_${user._id}_${type}`;
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "trustnet/verification",
      public_id: publicId,
      resource_type: "auto",
      overwrite: true,
      invalidate: true,
    });

    const document = {
      type,
      name: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      status: "draft",
      rejectionReason: "",
      uploadedAt: new Date(),
    };
    const existingIndex = user.verificationDocuments.findIndex((item) => item.type === type);
    if (existingIndex >= 0) user.verificationDocuments.set(existingIndex, document);
    else user.verificationDocuments.push(document);

    await user.save();

    return res.status(200).json({ success: true, data: serializeVerification(user) });
  } catch (error) {
    return next(error);
  }
}

async function submitVerification(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");
    if (["pending", "approved"].includes(user.verificationStatus)) {
      throw new ApiError(400, "Verification documents are already under review or approved.");
    }

    const uploadedTypes = new Set((user.verificationDocuments || []).map((document) => document.type));
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter((type) => !uploadedTypes.has(type));
    if (missingDocuments.length) {
      throw new ApiError(400, "Upload all required verification documents before submitting.");
    }

    for (const document of user.verificationDocuments) {
      document.status = "pending";
      document.rejectionReason = "";
    }
    user.verificationStatus = "pending";
    user.verificationSubmittedAt = new Date();
    user.verificationReviewedAt = undefined;
    await user.save();
    return res.status(200).json({ success: true, data: serializeVerification(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getVerification, uploadDocument, submitVerification };
