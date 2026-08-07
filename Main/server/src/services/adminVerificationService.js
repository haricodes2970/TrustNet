const userService = require("./userService");
const emailService = require("../services/email.service");

// All writes go through the existing userService so business logic stays in one
// place. This module only orchestrates the verification-approval workflow.
// Email delivery failures are logged, not thrown - a broken SMTP config must
// never block an approve/reject/resubmission decision from taking effect.

async function listPendingVerifications(options = {}) {
  const users = await userService.listUsers({ verificationStatus: "pending" }, options);
  return users;
}

async function getVerification(userId) {
  const user = await userService.getUserById(userId);
  return user;
}

async function approveVerification(userId) {
  const user = await userService.updateUser(userId, {
    verificationStatus: "approved",
    verificationReviewedAt: new Date(),
    isVerified: true,
  });

  emailService.sendVerificationApprovedEmail({ to: user.email }).catch((error) => {
    console.error(`[adminVerificationService] Failed to send approval email to ${user.email}: ${error.message}`);
  });

  return user;
}

async function rejectVerification(userId, reason) {
  const update = {
    verificationStatus: "rejected",
    verificationReviewedAt: new Date(),
    isVerified: false,
    "verificationDocuments.$[].status": "rejected",
  };

  if (reason !== undefined && reason !== null && reason !== "") {
    update["verificationDocuments.$[].rejectionReason"] = String(reason);
  }

  const user = await userService.updateUser(userId, update);

  emailService.sendVerificationRejectedEmail({ to: user.email, reason }).catch((error) => {
    console.error(`[adminVerificationService] Failed to send rejection email to ${user.email}: ${error.message}`);
  });

  return user;
}

// Distinct from reject: signals the user's documents need changes, not a
// final decision. Leaves the door open for re-upload the same way "draft"/
// "rejected" already do in verificationController's block-list checks.
async function requestResubmission(userId, reason) {
  const update = {
    verificationStatus: "resubmission_requested",
    verificationReviewedAt: new Date(),
    isVerified: false,
    "verificationDocuments.$[].status": "rejected",
  };

  if (reason !== undefined && reason !== null && reason !== "") {
    update["verificationDocuments.$[].rejectionReason"] = String(reason);
  }

  const user = await userService.updateUser(userId, update);

  emailService.sendVerificationResubmissionEmail({ to: user.email, reason }).catch((error) => {
    console.error(`[adminVerificationService] Failed to send resubmission email to ${user.email}: ${error.message}`);
  });

  return user;
}

module.exports = {
  listPendingVerifications,
  getVerification,
  approveVerification,
  rejectVerification,
  requestResubmission,
};
