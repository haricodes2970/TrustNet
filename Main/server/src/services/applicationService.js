const Application = require("../models/Application");
const jobService = require("../services/jobService");
const storageService = require("./storageService");
const ApiError = require("../utils/ApiError");
const { handleServiceError, normalizeFilter, applyQueryOptions, assertOwner } = require("./serviceUtils");

// Applications belong only to Jobs (Startup -> Job -> Application). Reuses
// jobService.getJobById/resolveStartupAccess (read-only) and storageService
// directly — deliberately NOT documentService/Document, per instruction.
//
// Three distinct authority shapes meet here, more than any prior module:
//   - candidate ownership: application.applicant === userId, a flat
//     comparison (reused via serviceUtils.assertOwner), no role involved.
//   - Startup owner/admin: via jobService.resolveStartupAccess(job.startup).
//   - everyone else (contributor included) gets NO access to a single
//     application — Contributor's "no access" is enforced explicitly here,
//     not inherited by accident from resolveStartupAccess (which would
//     otherwise report "contributor" for an active Team member).
// A platform admin bypasses all three, same override every other module
// in this codebase already has.

const TERMINAL_STATUSES = ["hired", "rejected", "withdrawn"];
const FORWARD_PATH = ["submitted", "under_review", "interview", "offer", "hired"];

// Pure, database-independent.
function assertValidStatusTransition(currentStatus, nextStatus) {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new ApiError(409, `Application is in a terminal state ("${currentStatus}") and cannot transition.`);
  }
  if (nextStatus === "rejected") {
    return; // staff may reject from any non-terminal state
  }
  const currentIndex = FORWARD_PATH.indexOf(currentStatus);
  const nextIndex = FORWARD_PATH.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    throw new ApiError(400, `Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
  }
}

// Pure, database-independent. Candidates never see internal notes, even on
// their own application.
function redactForCandidate(application) {
  const { notes, ...rest } = application;
  return rest;
}

async function resolveApplicationRole(application, userId, { isAdmin = false } = {}) {
  if (isAdmin) {
    return "admin";
  }
  if (String(application.applicant) === String(userId)) {
    return "candidate";
  }
  const job = await jobService.getJobById(application.job);
  const access = await jobService.resolveStartupAccess(job.startup, userId);
  // Deliberately excludes "contributor" — Applications grant Startup staff
  // access only at the owner/admin tier, never contributor, per spec.
  if (access.role === "owner" || access.role === "admin") {
    return access.role;
  }
  return null;
}

// job.status/isArchived/isHidden/deletedAt are all checked — an admin-
// hidden or admin-soft-deleted job (Admin Dashboard phase's content
// moderation) previously slipped past this, since only status/isArchived
// were checked here; a candidate could still apply to a job platform
// moderation had already taken down.
function assertJobAcceptingApplications(job) {
  if (job.status !== "published" || job.isArchived || job.isHidden || job.deletedAt) {
    throw new ApiError(409, "This job is not accepting applications.");
  }
}

async function createApplication({ jobId, coverLetter, buffer, mimeType, originalFileName }, userId) {
  try {
    const job = await jobService.getJobById(jobId);
    assertJobAcceptingApplications(job);

    const existing = await Application.findOne({
      job: jobId,
      applicant: userId,
      status: { $ne: "withdrawn" },
    }).lean();
    if (existing) {
      throw new ApiError(409, "You have already applied to this job.");
    }

    const stored = await storageService.upload({ buffer, mimeType, originalFileName });

    const application = await Application.create({
      job: jobId,
      applicant: userId,
      resumeStorageProvider: stored.storageProvider,
      resumeStorageKey: stored.storageKey,
      resumeChecksum: stored.checksum,
      resumeFileName: originalFileName,
      coverLetter: coverLetter || "",
      createdBy: userId,
    });

    return application.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "You have already applied to this job.");
    }
    throw handleServiceError(error, "Failed to submit application.");
  }
}

async function getApplicationById(id) {
  try {
    const application = await Application.findById(id).lean();
    if (!application) {
      throw new ApiError(404, "Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch application.");
  }
}

// Returns the application shaped for the requesting viewer (notes redacted
// for the candidate), after verifying access. Throws if the viewer has no
// role on this application at all (candidate ownership, or Startup
// owner/admin on the parent job, or platform admin) — contributor and any
// unrelated user included.
async function getApplicationForViewer(id, userId, { isAdmin = false } = {}) {
  try {
    const application = await getApplicationById(id);
    const role = await resolveApplicationRole(application, userId, { isAdmin });
    if (!role) {
      throw new ApiError(403, "You are not authorized to view this application.");
    }
    return role === "candidate" ? redactForCandidate(application) : application;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch application.");
  }
}

// No public tier, no contributor tier — every result is scoped so the
// caller can never see anything beyond what's rightfully theirs. Staff
// (owner/admin, or a platform admin only when an explicit `job` filter is
// given — same "targeted override, not a global bypass" shape Job's own
// admin override has) only see the full roster for a job when they
// explicitly filter by that job; every other case (including a candidate,
// a contributor, or staff without a `job` filter) is scoped to "my own
// applications only" by construction, not by a rejected/allowed branch —
// there is no case here where an unauthorized viewer sees someone else's
// data, because the query itself never asks for it.
async function listApplicationsForUser(userId, filter = {}, options = {}, { isAdmin = false } = {}) {
  try {
    const base = normalizeFilter(filter);

    if (base.job) {
      if (!isAdmin) {
        const job = await jobService.getJobById(base.job);
        const access = await jobService.resolveStartupAccess(job.startup, userId);
        if (access.role !== "owner" && access.role !== "admin") {
          base.applicant = userId;
        }
      }
    } else {
      base.applicant = userId;
    }

    const query = Application.find(base);
    const results = await applyQueryOptions(query, options).lean();

    // Redact notes for any result belonging to the caller-as-candidate view
    // (i.e. whenever this query was scoped to `applicant: userId`).
    if (base.applicant) {
      return results.map(redactForCandidate);
    }
    return results;
  } catch (error) {
    throw handleServiceError(error, "Failed to list applications.");
  }
}

async function assertEditableByCandidate(application, userId) {
  assertOwner(application.applicant, userId, "You are not authorized to update this application.", 403);
  if (application.status !== "submitted") {
    throw new ApiError(409, "This application can no longer be edited — it is already under review.");
  }
}

async function updateResume(id, userId, { buffer, mimeType, originalFileName }) {
  try {
    const existing = await getApplicationById(id);
    await assertEditableByCandidate(existing, userId);

    const stored = await storageService.upload({ buffer, mimeType, originalFileName });

    const application = await Application.findByIdAndUpdate(
      id,
      {
        resumeStorageProvider: stored.storageProvider,
        resumeStorageKey: stored.storageKey,
        resumeChecksum: stored.checksum,
        resumeFileName: originalFileName,
        updatedBy: userId,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!application) {
      throw new ApiError(404, "Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to update resume.");
  }
}

async function updateCoverLetter(id, userId, coverLetter) {
  try {
    const existing = await getApplicationById(id);
    await assertEditableByCandidate(existing, userId);

    const application = await Application.findByIdAndUpdate(
      id,
      { coverLetter: coverLetter || "", updatedBy: userId },
      { new: true, runValidators: true }
    ).lean();

    if (!application) {
      throw new ApiError(404, "Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to update cover letter.");
  }
}

async function updateStatus(id, userId, { status, notes }, { isAdmin = false } = {}) {
  try {
    const existing = await getApplicationById(id);
    if (!isAdmin) {
      const job = await jobService.getJobById(existing.job);
      const access = await jobService.resolveStartupAccess(job.startup, userId);
      if (access.role !== "owner" && access.role !== "admin") {
        throw new ApiError(403, "You are not authorized to update this application's status.");
      }
    }

    const safeUpdate = { updatedBy: userId };
    if (status) {
      assertValidStatusTransition(existing.status, status);
      safeUpdate.status = status;
    }
    if (notes !== undefined) {
      safeUpdate.notes = notes;
    }

    const application = await Application.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!application) {
      throw new ApiError(404, "Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to update application status.");
  }
}

async function withdraw(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getApplicationById(id);
    if (!isAdmin) {
      assertOwner(existing.applicant, userId, "You are not authorized to withdraw this application.", 403);
    }

    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new ApiError(409, `Application is in a terminal state ("${existing.status}") and cannot be withdrawn.`);
    }

    const application = await Application.findByIdAndUpdate(
      id,
      { status: "withdrawn", updatedBy: userId },
      { new: true }
    ).lean();

    if (!application) {
      throw new ApiError(404, "Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to withdraw application.");
  }
}

module.exports = {
  assertValidStatusTransition,
  redactForCandidate,
  resolveApplicationRole,
  assertJobAcceptingApplications,
  createApplication,
  getApplicationById,
  getApplicationForViewer,
  listApplicationsForUser,
  updateResume,
  updateCoverLetter,
  updateStatus,
  withdraw,
};
