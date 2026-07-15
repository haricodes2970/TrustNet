const crypto = require("crypto");
const env = require("../config/env");

function getEncryptionKey() {
  if (/^[a-f0-9]{64}$/i.test(env.TWO_FACTOR_ENCRYPTION_KEY || "")) {
    return Buffer.from(env.TWO_FACTOR_ENCRYPTION_KEY, "hex");
  }
  if (!env.JWT_ACCESS_SECRET) throw new Error("Two-factor authentication is not configured securely.");
  return crypto.createHash("sha256").update(`trustnet:two-factor:${env.JWT_ACCESS_SECRET}`).digest();
}

function encryptTwoFactorSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

function decryptTwoFactorSecret(value) {
  const [ivValue, tagValue, ciphertextValue] = String(value || "").split(":");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Stored two-factor secret is invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64")), decipher.final()]).toString("utf8");
}

module.exports = { encryptTwoFactorSecret, decryptTwoFactorSecret };
