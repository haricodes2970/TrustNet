const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
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
    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Content fields below are intentionally NOT `required` at the schema
    // level — drafts may be incomplete. Required-for-publish is a business
    // rule enforced in jobService.assertPublishReady(), not here.
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    remotePolicy: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
    },
    salaryMin: {
      type: Number,
      min: 0,
    },
    salaryMax: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "INR", "CAD", "AUD"],
      default: "USD",
    },
    description: {
      type: String,
      trim: true,
    },
    requirements: [{ type: String, trim: true, maxlength: 200 }],
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
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
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Job", jobSchema);
