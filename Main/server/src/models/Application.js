const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeStorageProvider: {
      type: String,
      required: true,
      enum: ["local"],
    },
    resumeStorageKey: {
      type: String,
      required: true,
    },
    resumeChecksum: {
      type: String,
      required: true,
    },
    resumeFileName: {
      type: String,
      required: true,
      trim: true,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ["submitted", "under_review", "interview", "offer", "hired", "rejected", "withdrawn"],
      default: "submitted",
      index: true,
    },
    // Internal, staff-only visibility — a single free-text field, not an
    // array. A dedicated note-history module is expected later; this field
    // is not designed to grow into one.
    notes: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Blocks a concurrent duplicate ACTIVE application (DB-level, race-safe) —
// a candidate may re-apply after withdrawing, since `status: withdrawn`
// falls outside this partial index's filter.
applicationSchema.index(
  { job: 1, applicant: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "withdrawn" } } }
);

module.exports = mongoose.model("Application", applicationSchema);
