const mongoose = require("mongoose");
const User = require("../models/User");
const userService = require("./userService");
const emailService = require("../services/email.service");
const ApiError = require("../utils/ApiError");
const { mapVerificationDocuments, mapVerificationDocumentSummaries } = require("./verificationDocument.service");
const { computeAccountStatus } = require("./accountStatus.service");

// All reads go through the existing userService so business logic stays in
// one place; mutations go straight to the User model with a conditional
// (status-matched) query instead of userService.updateUser, which only
// supports an unconditional {_id} update - the same "go straight to the
// model when the generic service can't express a needed guard" precedent
// adminModerationService already established for Job/ServiceListing.
// Email delivery failures are logged, not thrown - a broken SMTP config
// must never block an approve/reject/resubmission decision from taking
// effect.
//
// Error typing: 400 invalid userId format, 404 user not found, 409 state
// conflict (no pending submission to decide on, or the state changed
// between the read and the write).

function assertValidUserId(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID.");
  }
}

function serializeForAdmin(user) {
  return { ...user, verificationDocuments: mapVerificationDocuments(user.verificationDocuments || []) };
}

async function listPendingVerifications(options = {}) {
  const users = await userService.listUsers({ verificationStatus: "pending" }, options);
  return users.map((user) => ({
    ...(user.toObject ? user.toObject() : user),
    verificationDocuments: mapVerificationDocumentSummaries(user.verificationDocuments || []),
  }));
}

async function getVerification(userId) {
  assertValidUserId(userId);
  let user;
  try {
    user = await userService.getUserById(userId);
  } catch (error) {
    throw new ApiError(404, "User not found.");
  }
  return serializeForAdmin(user);
}

// Approve/reject/resubmission all share the same precondition: a decision
// can only be made on an account that has an actual pending submission
// under review ("missing documents cannot be approved" - an account that
// never submitted, or whose decision was already made, has nothing to
// decide on). Reaching the SAME state again is treated as an idempotent
// no-op (no duplicate email, no audit-worthy state change) rather than an
// error - "approval is idempotent"/"rejection is idempotent".
async function assertPendingOrIdempotent(userId, targetStatus) {
  const existing = await userService.getUserById(userId).catch(() => {
    throw new ApiError(404, "User not found.");
  });
  if (existing.verificationStatus === targetStatus) {
    return { alreadyInTargetState: true, user: existing };
  }
  if (existing.verificationStatus !== "pending") {
    throw new ApiError(
      409,
      `Cannot ${targetStatus === "approved" ? "approve" : "decide on"} this account: it has no pending verification submission.`
    );
  }
  return { alreadyInTargetState: false, user: existing };
}

async function approveVerification(userId) {
  assertValidUserId(userId);
  const { alreadyInTargetState, user: existing } = await assertPendingOrIdempotent(userId, "approved");
  if (alreadyInTargetState) {
    return serializeForAdmin(existing);
  }

  // Atomic, condition-checked update - only succeeds if the account is
  // still "pending" at write time, closing the race window between the
  // read above and this write (two admins approving/rejecting the same
  // account concurrently can't both "win").
  const user = await User.findOneAndUpdate(
    { _id: userId, verificationStatus: "pending" },
    {
      verificationStatus: "approved",
      verificationReviewedAt: new Date(),
      isVerified: true,
      accountStatus: computeAccountStatus({ emailVerified: true, verificationStatus: "approved" }),
    },
    { new: true, runValidators: true }
  ).lean();

  if (!user) {
    throw new ApiError(409, "Verification state changed - please refresh and try again.");
  }

  emailService.sendVerificationApprovedEmail({ to: user.email }).catch((error) => {
    console.error(`[adminVerificationService] Failed to send approval email to ${user.email}: ${error.message}`);
  });

  return serializeForAdmin(user);
}

async function rejectVerification(userId, reason) {
  assertValidUserId(userId);
  const { alreadyInTargetState, user: existing } = await assertPendingOrIdempotent(userId, "rejected");
  if (alreadyInTargetState) {
    return serializeForAdmin(existing);
  }

  const update = {
    verificationStatus: "rejected",
    verificationReviewedAt: new Date(),
    isVerified: false,
    accountStatus: computeAccountStatus({ emailVerified: true, verificationStatus: "rejected" }),
    "verificationDocuments.$[].status": "rejected",
  };
  if (reason !== undefined && reason !== null && reason !== "") {
    update["verificationDocuments.$[].rejectionReason"] = String(reason);
  }

  const user = await User.findOneAndUpdate({ _id: userId, verificationStatus: "pending" }, update, {
    new: true,
    runValidators: true,
  }).lean();

  if (!user) {
    throw new ApiError(409, "Verification state changed - please refresh and try again.");
  }

  emailService.sendVerificationRejectedEmail({ to: user.email, reason }).catch((error) => {
    console.error(`[adminVerificationService] Failed to send rejection email to ${user.email}: ${error.message}`);
  });

  return serializeForAdmin(user);
}

// Distinct from reject: signals the user's documents need changes, not a
// final decision. Leaves the door open for re-upload the same way "draft"/
// "rejected" already do in verificationController's block-list checks.
async function requestResubmission(userId, reason) {
  assertValidUserId(userId);
  const { alreadyInTargetState, user: existing } = await assertPendingOrIdempotent(userId, "resubmission_requested");
  if (alreadyInTargetState) {
    return serializeForAdmin(existing);
  }

  const update = {
    verificationStatus: "resubmission_requested",
    verificationReviewedAt: new Date(),
    isVerified: false,
    accountStatus: computeAccountStatus({ emailVerified: true, verificationStatus: "resubmission_requested" }),
    "verificationDocuments.$[].status": "rejected",
  };
  if (reason !== undefined && reason !== null && reason !== "") {
    update["verificationDocuments.$[].rejectionReason"] = String(reason);
  }

  const user = await User.findOneAndUpdate({ _id: userId, verificationStatus: "pending" }, update, {
    new: true,
    runValidators: true,
  }).lean();

  if (!user) {
    throw new ApiError(409, "Verification state changed - please refresh and try again.");
  }

  emailService.sendVerificationResubmissionEmail({ to: user.email, reason }).catch((error) => {
    console.error(`[adminVerificationService] Failed to send resubmission email to ${user.email}: ${error.message}`);
  });

  return serializeForAdmin(user);
}

module.exports = {
  listPendingVerifications,
  getVerification,
  approveVerification,
  rejectVerification,
  requestResubmission,
};
