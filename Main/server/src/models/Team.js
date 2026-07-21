const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address."],
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "pending",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    joinedAt: {
      type: Date,
    },
  },
  { _id: true }
);

const teamSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 80,
      match: [/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [teamMemberSchema],
    memberCount: {
      type: Number,
      default: 0,
      min: 0,
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

teamSchema.index({ startup: 1 });
teamSchema.index({ "members.email": 1 });
teamSchema.index({ "members.user": 1 });

module.exports = mongoose.model("Team", teamSchema);
