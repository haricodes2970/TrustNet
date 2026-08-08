const User = require("../models/User");

// Phase 16C: accountStatus is a DERIVED, persisted field - a single
// external-facing summary of where an account sits in the
// email-verification + Government ID/KYC pipeline. It has no writes of its
// own and no independent transition guards: every transition happens by
// advancing emailVerified or verificationStatus through their own existing,
// already-guarded code paths (Phase 16A's atomic OTP verify, Phase 16B's
// submit/approve/reject/resubmission guards), and accountStatus is
// recomputed as a side effect at each of those call sites. This is why it
// is safe against "arbitrary accountStatus changes" - there is no endpoint
// that writes it directly, only this function's output.
//
// isActive/deletedAt (account suspension/deletion) are deliberately NOT
// part of this state machine - they gate login/every-request access
// independently (see middlewares/auth.js's authenticate), orthogonal to
// verification progress. An account can be accountStatus:"APPROVED" and
// still fully blocked by isActive:false. Collapsing them would mean a
// suspended-then-reactivated APPROVED user loses their KYC state, or a
// rejected user's suspension accidentally reads as a verification state -
// neither is true today, so the fields stay independent.
//
// States, and the ONLY existing (emailVerified, verificationStatus)
// combinations that produce them:
//   EMAIL_PENDING          emailVerified=false (any verificationStatus)
//   KYC_PENDING            emailVerified=true, verificationStatus in [draft, not_submitted]
//   UNDER_REVIEW           emailVerified=true, verificationStatus=pending
//   APPROVED               emailVerified=true, verificationStatus=approved
//   REJECTED               emailVerified=true, verificationStatus=rejected
//   RESUBMISSION_REQUIRED  emailVerified=true, verificationStatus=resubmission_requested
//
// The phase brief's conceptual 7-rung lifecycle names EMAIL_VERIFIED and
// KYC_PENDING as separate rungs, but no existing field combination can
// distinguish "just verified email, hasn't touched KYC yet" from "verified,
// drafted/uploaded documents but not submitted" - both are
// verificationStatus:"draft". No code path treats them differently either.
// Per the phase's own "do not invent additional states unless the existing
// implementation requires them," they are merged into one KYC_PENDING
// state. "not_submitted" is a dead enum value (declared in the User schema,
// never written by any code path - the real default is "draft") and is
// mapped the same as "draft" for forward compatibility only.
const ACCOUNT_STATUSES = [
  "EMAIL_PENDING",
  "KYC_PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RESUBMISSION_REQUIRED",
];

function computeAccountStatus({ emailVerified, verificationStatus }) {
  if (!emailVerified) return "EMAIL_PENDING";

  switch (verificationStatus) {
    case "pending":
      return "UNDER_REVIEW";
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "resubmission_requested":
      return "RESUBMISSION_REQUIRED";
    case "draft":
    case "not_submitted":
    default:
      return "KYC_PENDING";
  }
}

// Recomputes and persists accountStatus for one user from their CURRENT
// emailVerified/verificationStatus values. Used by the migration/backfill
// script; not used on the normal request path, where each transition site
// computes and writes accountStatus inline as part of its own atomic update
// (avoids an extra round trip and keeps the write atomic with the source
// field change).
async function syncAccountStatus(userId) {
  const user = await User.findById(userId).select("emailVerified verificationStatus accountStatus");
  if (!user) return null;

  const next = computeAccountStatus(user);
  if (user.accountStatus !== next) {
    user.accountStatus = next;
    await user.save();
  }
  return next;
}

module.exports = { ACCOUNT_STATUSES, computeAccountStatus, syncAccountStatus };
