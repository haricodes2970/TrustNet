const userService = require("./userService");

// All writes go through the existing userService so business logic stays in one
// place. This module only orchestrates the verification-approval workflow.

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
  return user;
}

module.exports = {
  listPendingVerifications,
  getVerification,
  approveVerification,
  rejectVerification,
};
