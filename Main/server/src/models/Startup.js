const mongoose = require("mongoose");

const startupSchema = new mongoose.Schema(
  {
    founder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 80,
      match: [/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."],
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 50,
      maxlength: 5000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    stage: {
      type: String,
      enum: ["idea", "validation", "early-stage", "growth", "established"],
      default: "idea",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    websiteUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: "Website URL must be a valid URL.",
      },
    },
    pitchDeckUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: "Pitch deck URL must be a valid URL.",
      },
    },
    logoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: "Logo URL must be a valid URL.",
      },
    },
    problemStatement: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    solution: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    targetMarket: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    fundingGoal: {
      type: Number,
      min: 0,
    },
    fundingRaised: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "INR", "CAD", "AUD"],
      default: "USD",
    },
    status: {
      type: String,
      enum: ["draft", "active", "hidden", "closed"],
      default: "draft",
    },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

startupSchema.index({ name: "text", tagline: "text", description: "text" });

module.exports = mongoose.model("Startup", startupSchema);
