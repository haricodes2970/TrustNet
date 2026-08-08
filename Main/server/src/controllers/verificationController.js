const User = require("../models/User");
const cloudinary = require("../services/cloudinary.service");
const emailService = require("../services/email.service");
const auditLogService = require("../services/auditLogService");
const { mapVerificationDocuments } = require("../services/verificationDocument.service");
const { computeAccountStatus } = require("../services/accountStatus.service");
const ApiError = require("../utils/ApiError");

const REQUIRED_DOCUMENT_TYPES = ["government_id", "company_registration", "business_website", "linkedin"];

function serializeVerification(user) {
  return {
    status: user.verificationStatus || "draft",
    accountStatus: user.accountStatus || "EMAIL_PENDING",
    submittedAt: user.verificationSubmittedAt || null,
    reviewedAt: user.verificationReviewedAt || null,
    documents: mapVerificationDocuments(user.verificationDocuments || []),
  };
}

function logAction(req, action, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "User", targetId: req.user.id, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
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
    // type: "authenticated" - Cloudinary refuses to serve this resource to
    // an unsigned request, closing the public-document-exposure gap (see
    // verificationDocument.service.js). resource_type/format from the
    // upload result are persisted so a signed access URL can be
    // regenerated later without needing to re-derive them.
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "trustnet/verification",
      public_id: publicId,
      resource_type: "auto",
      type: "authenticated",
      overwrite: true,
      invalidate: true,
    });

    const document = {
      type,
      name: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      status: "draft",
      rejectionReason: "",
      uploadedAt: new Date(),
    };
    const existingIndex = user.verificationDocuments.findIndex((item) => item.type === type);
    if (existingIndex >= 0) user.verificationDocuments.set(existingIndex, document);
    else user.verificationDocuments.push(document);

    await user.save();

    // Never logs the file itself - only the document type, matching "do
    // not log government ID images/raw document contents."
    logAction(req, "verification.document_upload", { documentType: type });

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
    user.accountStatus = computeAccountStatus({ emailVerified: user.emailVerified, verificationStatus: "pending" });
    await user.save();

    logAction(req, "verification.submit", {});

    // "User receives confirmation that verification is under review" -
    // never blocks the submission itself on delivery failure, same
    // "notifications must never block the primary action" convention used
    // throughout this codebase.
    emailService.sendVerificationSubmittedEmail({ to: user.email }).catch((error) => {
      console.error(`[email] Failed to send verification-submitted email to ${user.email}: ${error.message}`);
    });

    return res.status(200).json({ success: true, data: serializeVerification(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getVerification, uploadDocument, submitVerification };
