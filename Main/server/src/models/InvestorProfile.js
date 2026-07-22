const mongoose = require("mongoose");

const investorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    organization: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    investmentThesis: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    // Reuses Startup's own stage enum rather than inventing a parallel one.
    preferredStages: [
      {
        type: String,
        enum: ["idea", "validation", "early-stage", "growth", "established"],
      },
    ],
    preferredIndustries: [{ type: String, trim: true, maxlength: 50 }],
    preferredRegions: [{ type: String, trim: true, maxlength: 100 }],
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

// No verificationStatus field — deliberately reuses User.verificationStatus
// (the existing KYC system) instead of a parallel, duplicated concept.

module.exports = mongoose.model("InvestorProfile", investorProfileSchema);
