const mongoose = require("mongoose");

const userPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    notifications: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    marketingEmails: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      enum: ["system", "light", "dark"],
      default: "system",
    },
    language: {
      type: String,
      trim: true,
      maxlength: 10,
      default: "en",
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 64,
      default: "",
    },
    privacy: {
      type: String,
      enum: ["public", "private", "connections"],
      default: "public",
    },
    profileVisibility: {
      type: String,
      enum: ["public", "private", "connections"],
      default: "public",
    },
    allowMessages: {
      type: Boolean,
      default: true,
    },
    allowCollaborationRequests: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("UserPreference", userPreferenceSchema);
