const Job = require("../models/Job");
const Startup = require("../models/Startup");
const Team = require("../models/Team");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Hiring is a Startup-domain module: Startup -> Job, with NO Workspace and
// NO Project dependency. workspaceService.resolveWorkspaceAccess() already
// computes the identical founder/admin/contributor role, but only via a
// Workspace id — reusing it would force every Startup through Workspace
// first, which is explicitly rejected. The alternative (extracting a shared
// primitive out of workspaceService.js) was rejected too: the collaboration
// permission layer is already integration-tested and is being deliberately
// left untouched until a dedicated refactoring phase.
//
// So: resolveStartupAccess() and getAccessibleStartupIds() below are a
// DELIBERATE, KNOWN duplication of the role-computation logic that already
// lives in workspaceService.resolveWorkspaceAccess()/listWorkspacesForUser().
// This is not an oversight — it's the explicitly chosen tradeoff for this
// phase. See docs/modules/hiring.md and BACKLOG.md for the standing note to
// collapse this duplication in a future refactor.

async function resolveStartupAccess(startupId, userId) {
  const startup = await Startup.findById(startupId).lean();
  if (!startup) {
    return { role: null };
  }

  if (String(startup.founder) === String(userId)) {
    return { role: "owner" };
  }

  const team = await Team.findOne({ startup: startupId }).lean();
  if (!team) {
    return { role: null };
  }

  const member = team.members.find(
    (m) => m.user && String(m.user) === String(userId) && m.status === "active"
  );

  if (!member) {
    return { role: null };
  }

  return { role: member.role === "admin" ? "admin" : "contributor" };
}

async function getAccessibleStartupIds(userId) {
  const founded = await Startup.find({ founder: userId }).select("_id").lean();
  const teams = await Team.find({ "members.user": userId, "members.status": "active" })
    .select("startup")
    .lean();

  const ids = [...founded.map((s) => s._id), ...teams.map((t) => t.startup)];
  const unique = new Map(ids.map((id) => [String(id), id]));
  return Array.from(unique.values());
}

// Pure, database-independent.
function validateSalaryRange(salaryMin, salaryMax) {
  if (salaryMin != null && salaryMax != null && Number(salaryMin) > Number(salaryMax)) {
    throw new Error("salaryMin must be less than or equal to salaryMax.");
  }
}

// Pure, database-independent. Publishing requires the content fields a
// draft is allowed to skip, and the job must not be archived.
function assertPublishReady(job) {
  if (job.isArchived) {
    throw new Error("Archived jobs cannot be published.");
  }

  const missing = ["title", "description", "employmentType", "remotePolicy"].filter(
    (field) => !job[field]
  );
  if (missing.length > 0) {
    throw new Error(`Cannot publish: missing required field(s): ${missing.join(", ")}.`);
  }
}

async function createJob(
  { startupId, title, department, employmentType, location, remotePolicy, salaryMin, salaryMax, currency, description, requirements },
  userId
) {
  try {
    const access = await resolveStartupAccess(startupId, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new Error("You are not authorized to create jobs for this startup.");
    }

    validateSalaryRange(salaryMin, salaryMax);

    const job = await Job.create({
      startup: startupId,
      title,
      department,
      employmentType,
      location,
      remotePolicy,
      salaryMin,
      salaryMax,
      currency,
      description,
      requirements,
      createdBy: userId,
    });

    return job.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to create job.");
  }
}

async function getJobById(id) {
  try {
    const job = await Job.findById(id).lean();
    if (!job) {
      throw new Error("Job not found.");
    }
    return job;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch job.");
  }
}

// userId may be null/undefined — anonymous, public visitor. Deliberately
// throws the SAME "Job not found" message whether the job doesn't exist,
// is a draft/closed job an outsider has no role on, or exists but the
// caller has no accessible relationship to its Startup — never revealing
// which case applies. The controller maps every rejection from this
// function to 404, never 403 (see documentController-style split used by
// every other module — Job's read path deliberately does NOT follow that
// convention; see docs/modules/hiring.md).
async function assertJobViewAccess(job, userId) {
  const isPubliclyVisible = job.status === "published" && !job.isArchived;
  if (isPubliclyVisible) {
    return { role: userId ? (await resolveStartupAccess(job.startup, userId)).role : null };
  }

  if (!userId) {
    throw new Error("Job not found.");
  }

  const access = await resolveStartupAccess(job.startup, userId);
  if (!access.role) {
    throw new Error("Job not found.");
  }
  return access;
}

async function listJobsForUser(userId, filter = {}, options = {}) {
  try {
    const base = normalizeFilter(filter);
    const accessibleStartupIds = userId ? await getAccessibleStartupIds(userId) : [];

    if (base.startup) {
      const hasRole = accessibleStartupIds.some((id) => String(id) === String(base.startup));
      if (!hasRole) {
        // No relationship to this specific startup — silently degrades to
        // the public subset rather than rejecting. This is the "downgrade,
        // not deny" behavior deliberate for Hiring's public tier; it is
        // NOT a bypass — the caller never sees anything beyond what an
        // anonymous visitor could already see for this startup.
        base.status = "published";
        base.isArchived = false;
      }
    } else if (accessibleStartupIds.length > 0) {
      base.$or = [
        { status: "published", isArchived: false },
        { startup: { $in: accessibleStartupIds } },
      ];
    } else {
      base.status = "published";
      base.isArchived = false;
    }

    const query = Job.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list jobs.");
  }
}

async function updateJob(id, userId, updateData) {
  try {
    const existing = await getJobById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new Error("You are not authorized to update this job.");
    }

    const safeUpdate = { ...updateData };
    delete safeUpdate.startup;
    delete safeUpdate.createdBy;
    delete safeUpdate.isArchived;
    delete safeUpdate.status; // status changes only via publish/unpublish

    const mergedMin = Object.prototype.hasOwnProperty.call(safeUpdate, "salaryMin")
      ? safeUpdate.salaryMin
      : existing.salaryMin;
    const mergedMax = Object.prototype.hasOwnProperty.call(safeUpdate, "salaryMax")
      ? safeUpdate.salaryMax
      : existing.salaryMax;
    validateSalaryRange(mergedMin, mergedMax);

    safeUpdate.updatedBy = userId;

    const job = await Job.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!job) {
      throw new Error("Job not found.");
    }

    return job;
  } catch (error) {
    throw handleServiceError(error, "Failed to update job.");
  }
}

async function archiveJob(id, userId) {
  try {
    const existing = await getJobById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new Error("You are not authorized to archive this job.");
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { isArchived: true, updatedBy: userId },
      { new: true }
    ).lean();

    if (!job) {
      throw new Error("Job not found.");
    }

    return job;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive job.");
  }
}

async function publishJob(id, userId) {
  try {
    const existing = await getJobById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new Error("You are not authorized to publish this job.");
    }

    assertPublishReady(existing);

    const job = await Job.findByIdAndUpdate(
      id,
      { status: "published", updatedBy: userId },
      { new: true }
    ).lean();

    if (!job) {
      throw new Error("Job not found.");
    }

    return job;
  } catch (error) {
    throw handleServiceError(error, "Failed to publish job.");
  }
}

async function unpublishJob(id, userId) {
  try {
    const existing = await getJobById(id);
    const access = await resolveStartupAccess(existing.startup, userId);
    if (access.role !== "owner" && access.role !== "admin") {
      throw new Error("You are not authorized to unpublish this job.");
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { status: "draft", updatedBy: userId },
      { new: true }
    ).lean();

    if (!job) {
      throw new Error("Job not found.");
    }

    return job;
  } catch (error) {
    throw handleServiceError(error, "Failed to unpublish job.");
  }
}

module.exports = {
  resolveStartupAccess,
  getAccessibleStartupIds,
  validateSalaryRange,
  assertPublishReady,
  createJob,
  getJobById,
  assertJobViewAccess,
  listJobsForUser,
  updateJob,
  archiveJob,
  publishJob,
  unpublishJob,
};
