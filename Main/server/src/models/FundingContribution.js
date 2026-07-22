const mongoose = require("mongoose");

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

const fundingContributionSchema = new mongoose.Schema(
  {
    fundingRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FundingRound",
      required: true,
      index: true,
    },
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      enum: CURRENCIES,
      required: true,
    },
    status: {
      type: String,
      enum: ["pledged", "confirmed", "rejected", "withdrawn"],
      default: "pledged",
      index: true,
    },
    note: {
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
  },
  {
    timestamps: true,
  }
);

// No partial unique index on { fundingRound, investor } — unlike
// InvestmentInterest/Application, an investor may hold multiple concurrent
// pledges to the same round (e.g. topping up). A uniqueness constraint here
// would be actively wrong, not merely unnecessary.

module.exports = mongoose.model("FundingContribution", fundingContributionSchema);
