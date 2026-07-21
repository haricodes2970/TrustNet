const Application = require("../models/Application");
const jobService = require("../services/jobService");
const storageService = require("./storageService");
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

const TERMINAL_STATUSES = ["hired", "rejected", "withdrawn"];
const FORWARD_PATH = ["submitted", "under_review", "interview", "offer", "hired"];

// Pure, database-independent.
function assertValidStatusTransition(currentStatus, nextStatus) {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new Error(`Application is in a terminal state ("${currentStatus}") and cannot transition.`);
  }
  if (nextStatus === "rejected") {
    return; // staff may reject from any non-terminal state
  }
  const currentIndex = FORWARD_PATH.indexOf(currentStatus);
  const nextIndex = FORWARD_PATH.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    throw new Error(`Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
  }
}

// Pure, database-independent. Candidates never see internal notes, even on
// their own application.
function redactForCandidate(application) {
  const { notes, ...rest } = application;
  return rest;
}

async function resolveApplicationRole(application, userId) {
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

async function createApplication({ jobId, coverLetter, buffer, mimeType, originalFileName }, userId) {
  try {
    const job = await jobService.getJobById(jobId);
    if (job.status !== "published" || job.isArchived) {
      throw new Error("This job is not accepting applications.");
    }

    const existing = await Application.findOne({
      job: jobId,
      applicant: userId,
      status: { $ne: "withdrawn" },
    }).lean();
    if (existing) {
      throw new Error("You have already applied to this job.");
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
      throw new Error("You have already applied to this job.");
    }
    throw handleServiceError(error, "Failed to submit application.");
  }
}

async function getApplicationById(id) {
  try {
    const application = await Application.findById(id).lean();
    if (!application) {
      throw new Error("Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch application.");
  }
}

// Returns the application shaped for the requesting viewer (notes redacted
// for the candidate), after verifying access. Throws if the viewer has no
// role on this application at all (candidate ownership, or Startup
// owner/admin on the parent job) — contributor and any unrelated user
// included.
async function getApplicationForViewer(id, userId) {
  try {
    const application = await getApplicationById(id);
    const role = await resolveApplicationRole(application, userId);
    if (!role) {
      throw new Error("You are not authorized to view this application.");
    }
    return role === "candidate" ? redactForCandidate(application) : application;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch application.");
  }
}

// No public tier, no contributor tier — every result is scoped so the
// caller can never see anything beyond what's rightfully theirs. Staff
// (owner/admin) only see the full roster for a job when they explicitly
// filter by that job AND hold a role on it; every other case (including a
// candidate, a contributor, or staff without a `job` filter) is scoped to
// "my own applications only" by construction, not by a rejected/allowed
// branch — there is no case here where an unauthorized viewer sees someone
// else's data, because the query itself never asks for it.
async function listApplicationsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);

    if (base.job) {
      const job = await jobService.getJobById(base.job);
      const access = await jobService.resolveStartupAccess(job.startup, userId);
      if (access.role !== "owner" && access.role !== "admin") {
        base.applicant = userId;
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
  assertOwner(application.applicant, userId, "You are not authorized to update this application.");
  if (application.status !== "submitted") {
    throw new Error("This application can no longer be edited — it is already under review.");
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
      throw new Error("Application not found.");
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
      throw new Error("Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to update cover letter.");
  }
}

async function updateStatus(id, userId, { status, notes }) {
  try {
    const existing = await getApplicationById(id);
    const job = await jobService.getJobById(existing.job);
    const access = await jobService.resolveStartupAccess(job.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new Error("You are not authorized to update this application's status.");
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
      throw new Error("Application not found.");
    }
    return application;
  } catch (error) {
    throw handleServiceError(error, "Failed to update application status.");
  }
}

async function withdraw(id, userId) {
  try {
    const existing = await getApplicationById(id);
    assertOwner(existing.applicant, userId, "You are not authorized to withdraw this application.");

    if (TERMINAL_STATUSES.includes(existing.status)) {
      throw new Error(`Application is in a terminal state ("${existing.status}") and cannot be withdrawn.`);
    }

    const application = await Application.findByIdAndUpdate(
      id,
      { status: "withdrawn", updatedBy: userId },
      { new: true }
    ).lean();

    if (!application) {
      throw new Error("Application not found.");
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
  createApplication,
  getApplicationById,
  getApplicationForViewer,
  listApplicationsForUser,
  updateResume,
  updateCoverLetter,
  updateStatus,
  withdraw,
};
