const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    // Discriminator for the storage abstraction (storageService.js). Widen
    // this enum whenever a new provider is added — it's the one place a new
    // provider requires a schema change.
    storageProvider: {
      type: String,
      required: true,
      enum: ["local"],
    },
    // Opaque, provider-specific identifier. Never a delivery URL — URLs are
    // generated on demand via storageService.downloadUrl(), never persisted.
    storageKey: {
      type: String,
      required: true,
    },
    // sha256 hex digest of the uploaded file contents, for integrity checks.
    checksum: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", documentSchema);
