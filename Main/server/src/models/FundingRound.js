const mongoose = require("mongoose");

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

const fundingRoundSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    roundType: {
      type: String,
      enum: ["pre-seed", "seed", "series-a", "series-b", "series-c", "bridge", "other"],
      required: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Denormalized sum of this round's own confirmed contributions only —
    // maintained exclusively via atomic $inc in fundingContributionService,
    // never a read-modify-write. Distinct from Startup.fundingRaised, which
    // aggregates across all of a Startup's rounds.
    raisedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: CURRENCIES,
      default: "USD",
    },
    minimumContribution: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "cancelled"],
      default: "draft",
      index: true,
    },
    openedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
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
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FundingRound", fundingRoundSchema);
