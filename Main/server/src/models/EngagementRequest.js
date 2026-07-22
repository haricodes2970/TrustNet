const mongoose = require("mongoose");

const engagementRequestSchema = new mongoose.Schema(
  {
    serviceListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceListing",
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
      enum: ["requested", "accepted", "declined", "in_progress", "completed", "cancelled"],
      default: "requested",
      index: true,
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

// Blocks a concurrent duplicate ACTIVE request from the same Startup to the
// same listing — a Startup may re-request after any terminal outcome
// (declined, cancelled, OR completed), unlike Application/InvestmentInterest
// which only exclude one terminal status. Re-engagement after a successful
// completed engagement is allowed by design.
engagementRequestSchema.index(
  { serviceListing: 1, startup: 1 },
  { unique: true, partialFilterExpression: { status: { $nin: ["declined", "cancelled", "completed"] } } }
);

module.exports = mongoose.model("EngagementRequest", engagementRequestSchema);
