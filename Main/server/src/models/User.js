const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores."],
    },
    password: {
      type: String,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorPendingSecret: {
      type: String,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    linkedinId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address."],
    },
    avatarUrl: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: "Avatar URL must be a valid URL.",
      },
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    designation: {
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
    role: {
      type: String,
      enum: ["founder", "entrepreneur", "investor", "client", "mentor", "builder", "admin"],
      default: "builder",
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    linkedin: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: "LinkedIn URL must be a valid URL.",
      },
    },
    interests: [{ type: String, trim: true, maxlength: 50 }],
    skills: [{ type: String, trim: true, maxlength: 50 }],
    // Email OTP verification (Phase 16A) - deliberately separate from
    // isVerified/verificationStatus/verificationDocuments below, which are
    // the Government ID/KYC admin-approval workflow (Phase 16B/16C), a
    // completely different concern. Conflating the two would break the
    // existing KYC gate (requireApprovedVerification) and admin
    // verification queue. emailVerificationCodeHash/Expires/Attempts are
    // select:false, same as resetPasswordToken/Expires - never returned by
    // a normal query, only fetched with an explicit .select("+...").
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
    },
    emailVerificationCodeHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["not_submitted", "draft", "pending", "approved", "rejected", "resubmission_requested"],
      default: "draft",
    },
    verificationSubmittedAt: {
      type: Date,
    },
    verificationReviewedAt: {
      type: Date,
    },
    verificationDocuments: [
      {
        type: {
          type: String,
          enum: ["government_id", "company_registration", "business_website", "linkedin", "startup_registration"],
          required: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        // resourceType/format let a signed, short-lived access URL be
        // regenerated on demand (Phase 16B) - documents are uploaded to
        // Cloudinary with type:"authenticated" (see verificationController.
        // uploadDocument), so the raw `url` captured at upload time is not
        // independently fetchable and is kept for reference only. See
        // verificationDocument.service.js.
        resourceType: {
          type: String,
        },
        format: {
          type: String,
        },
        status: {
          type: String,
          enum: ["draft", "pending", "approved", "rejected"],
          default: "draft",
        },
        rejectionReason: {
          type: String,
          trim: true,
          maxlength: 500,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    profileVisibility: {
      type: String,
      enum: ["public", "private", "connections"],
      default: "public",
    },
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
