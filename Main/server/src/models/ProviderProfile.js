const mongoose = require("mongoose");

const providerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    serviceCategories: [{ type: String, trim: true, maxlength: 50 }],
    portfolioUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: "Portfolio URL must be a valid URL.",
      },
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

// No verificationStatus field — deliberately reuses User.verificationStatus
// (the existing KYC system) instead of a parallel, duplicated concept, same
// reasoning InvestorProfile already established.

module.exports = mongoose.model("ProviderProfile", providerProfileSchema);
