const cloudinary = require("./cloudinary.service");

// Phase 16B: verification documents (government ID, etc.) are the most
// sensitive files this codebase handles. They were previously uploaded
// with Cloudinary's default public "upload" delivery type - the stored
// secure_url is a publicly-fetchable CDN link requiring no authentication,
// and it was returned as-is in API responses (the owner's own
// GET /verification, and every admin verification response). Anyone who
// obtained that URL by any means (browser history, a shared screenshot, a
// logged response, a compromised admin session) could view the raw
// document with no further access control.
//
// Fix: documents are now uploaded with type:"authenticated" (see
// verificationController.uploadDocument) - Cloudinary refuses to serve an
// authenticated-type resource without a valid signature, so the captured
// secure_url becomes non-functional for direct access on its own. This
// module regenerates a fresh, short-lived, signed URL on every read
// instead - private_download_url is a pure local HMAC signing operation
// (no network call to Cloudinary), so this stays cheap to call per
// request. Only ever invoked after the caller has already passed
// authorization (the document's own owner, or an admin) - it has no
// authorization logic of its own, same "reuse the existing decision"
// posture as every other read-only helper in this codebase.

const SIGNED_URL_TTL_SECONDS = 15 * 60; // matches Documents' (Phase 8) signed download URL convention

function buildSignedDocumentUrl(document) {
  if (!document || !document.publicId) {
    return null;
  }
  return cloudinary.utils.private_download_url(document.publicId, document.format || "jpg", {
    resource_type: document.resourceType || "image",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
  });
}

// Maps raw stored documents to the safe, externally-facing shape used by
// both the owner's own view and an admin's single-verification view -
// publicId/resourceType/format are internal fields never useful to an API
// consumer and are dropped here rather than leaked.
function mapVerificationDocuments(documents = []) {
  return documents.map((document) => ({
    type: document.type,
    name: document.name,
    url: buildSignedDocumentUrl(document),
    status: document.status,
    rejectionReason: document.rejectionReason || "",
    uploadedAt: document.uploadedAt,
  }));
}

// Lighter shape for the admin bulk-pending-list view: metadata only, no
// signed URLs generated (an admin reviewing the queue doesn't need to view
// every document of every pending user just to see who's waiting) and no
// publicId either. Cuts down unnecessary document exposure on a surface
// that's about triage, not review.
function mapVerificationDocumentSummaries(documents = []) {
  return documents.map((document) => ({
    type: document.type,
    status: document.status,
    uploadedAt: document.uploadedAt,
  }));
}

module.exports = {
  SIGNED_URL_TTL_SECONDS,
  buildSignedDocumentUrl,
  mapVerificationDocuments,
  mapVerificationDocumentSummaries,
};
