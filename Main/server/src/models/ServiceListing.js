const mongoose = require("mongoose");

const serviceListingSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProviderProfile",
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
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    // Not `required` at the schema level — drafts may be incomplete.
    // Required-for-publish is a business rule enforced in
    // serviceListingService.assertPublishReady(), same split Job uses.
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    pricingModel: {
      type: String,
      enum: ["fixed", "hourly", "retainer", "custom"],
    },
    priceMin: {
      type: Number,
      min: 0,
    },
    priceMax: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "INR", "CAD", "AUD"],
      default: "USD",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    tags: [{ type: String, trim: true, maxlength: 30 }],
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
    isHidden: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ServiceListing", serviceListingSchema);
