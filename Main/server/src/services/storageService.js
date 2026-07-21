const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

// Storage abstraction for the Documents module. Exposes exactly three
// operations — upload/downloadUrl/remove — so a future provider (S3,
// Cloudinary, etc.) can be swapped in without changing documentService.js
// or the Document schema (beyond widening the `storageProvider` enum).
//
// No external provider was specified for this phase, so this implements a
// local-disk default provider only — the "most appropriate equivalent"
// available without inventing cloud credentials this repo doesn't have.
// Every function is provider-aware (`storageProvider` is the first/only
// argument distinguishing providers) so adding a second provider later is a
// branch inside these three functions, not a rewrite of their signatures.

const STORAGE_ROOT = path.join(__dirname, "..", "..", "storage", "documents");

async function ensureStorageRoot() {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
}

// upload({ buffer, mimeType, originalFileName }) -> { storageProvider, storageKey, checksum, fileSize }
async function upload({ buffer, originalFileName }) {
  await ensureStorageRoot();

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const safeName = path.basename(originalFileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeName}`;

  await fs.writeFile(path.join(STORAGE_ROOT, storageKey), buffer);

  return {
    storageProvider: "local",
    storageKey,
    checksum,
    fileSize: buffer.length,
  };
}

// downloadUrl(storageProvider, storageKey) -> string
// Generated on demand, never persisted. For the local provider this is a
// deterministic path only — no HTTP route currently serves it (out of scope
// for this phase: no file-delivery endpoint was requested). A future
// provider (e.g. S3) would return a real signed/expiring URL here instead.
async function downloadUrl(storageProvider, storageKey) {
  if (storageProvider !== "local") {
    throw new Error(`Unsupported storage provider: ${storageProvider}`);
  }
  return `/local-storage/documents/${storageKey}`;
}

// remove(storageProvider, storageKey) -> void
// Not called by any endpoint in this phase (archive is a soft delete, same
// convention as every other collaboration module) — exposed because the
// interface requires it, available for a future hard-delete/cleanup flow.
async function remove(storageProvider, storageKey) {
  if (storageProvider !== "local") {
    throw new Error(`Unsupported storage provider: ${storageProvider}`);
  }
  try {
    await fs.unlink(path.join(STORAGE_ROOT, storageKey));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = { upload, downloadUrl, remove };
