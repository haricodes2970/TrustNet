const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
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
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ["startup", "investor", "mentor", "general", "industry", "innovation"],
      default: "general",
    },
    type: {
      type: String,
      enum: ["public", "private", "restricted"],
      default: "public",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rules: [{ type: String, trim: true, maxlength: 200 }],
    tags: [{ type: String, trim: true, maxlength: 30 }],
    coverImageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: "Cover image URL must be a valid URL.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    memberCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Community", communitySchema);
