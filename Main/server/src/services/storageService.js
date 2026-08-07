const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const jwtConfig = require("../config/jwt");

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

const DOWNLOAD_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Reuses the existing JWT access secret rather than inventing a new
// secret-management surface for a URL-signing feature this small.
function signDownload(storageKey, expiresAt) {
  return crypto.createHmac("sha256", jwtConfig.accessSecret).update(`${storageKey}.${expiresAt}`).digest("hex");
}

// verifyDownloadToken(storageKey, expiresAt, signature) -> boolean
// No file-delivery route consumes this yet (still out of scope — none was
// requested this phase), but the sign/verify pair is real and tested: even
// though GET /documents/:id is itself auth-gated, a returned URL can be
// copied out of that response and shared/cached elsewhere, so it needs its
// own tamper-evident, time-limited guarantee independent of that request's
// auth — the same reason S3 presigned URLs expire.
function verifyDownloadToken(storageKey, expiresAt, signature) {
  const expiresNum = Number(expiresAt);
  if (!expiresNum || Number.isNaN(expiresNum) || Date.now() > expiresNum) {
    return false;
  }
  const expected = signDownload(storageKey, expiresNum);
  const expectedBuf = Buffer.from(expected, "hex");
  const givenBuf = Buffer.from(String(signature || ""), "hex");
  if (expectedBuf.length !== givenBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

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
// Generated on demand, never persisted. Signed and time-limited (15 min) -
// a bare deterministic path was previously guessable and never expired. No
// HTTP route currently serves this yet (still out of scope: no file-
// delivery endpoint was requested), but the signature is real and checked
// via verifyDownloadToken() below, ready for that route when it's built.
async function downloadUrl(storageProvider, storageKey) {
  if (storageProvider !== "local") {
    throw new Error(`Unsupported storage provider: ${storageProvider}`);
  }
  const expiresAt = Date.now() + DOWNLOAD_URL_TTL_MS;
  const signature = signDownload(storageKey, expiresAt);
  return `/local-storage/documents/${storageKey}?expires=${expiresAt}&signature=${signature}`;
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

module.exports = { upload, downloadUrl, verifyDownloadToken, remove };
