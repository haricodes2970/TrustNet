const mongoose = require("mongoose");

const investmentInterestSchema = new mongoose.Schema(
  {
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["submitted", "reviewing", "contacted", "accepted", "declined", "withdrawn"],
      default: "submitted",
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
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

// Blocks a concurrent duplicate ACTIVE interest (DB-level, race-safe) — an
// investor may re-express interest after withdrawing, since
// `status: withdrawn` falls outside this partial index's filter. Same
// pattern as Application's { job, applicant } index.
investmentInterestSchema.index(
  { startup: 1, investor: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "withdrawn" } } }
);

module.exports = mongoose.model("InvestmentInterest", investmentInterestSchema);
