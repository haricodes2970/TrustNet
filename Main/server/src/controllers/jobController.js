const jobService = require("../services/jobService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

function isPlatformAdmin(req) {
  return req.user && req.user.role === "admin";
}

function statusOf(error, fallback = 400) {
  return error instanceof ApiError ? error.statusCode : fallback;
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Job", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createJob(req, res) {
  try {
    const job = await jobService.createJob(
      {
        startupId: req.body.startupId,
        title: req.body.title,
        department: req.body.department,
        employmentType: req.body.employmentType,
        location: req.body.location,
        remotePolicy: req.body.remotePolicy,
        salaryMin: req.body.salaryMin,
        salaryMax: req.body.salaryMax,
        currency: req.body.currency,
        description: req.body.description,
        requirements: req.body.requirements,
      },
      req.user.id,
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "job.create", job._id, { startupId: req.body.startupId, title: job.title });
    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

// Deliberately always 404 on any denial — concealing existence of
// unpublished jobs from unauthorized/anonymous viewers, not just their
// content. This is a deliberate exception to the 403-on-no-access
// convention every other module in this repo follows; see
// docs/modules/hiring.md. req.user may be undefined (public route with no
// authenticate middleware) or, when present, role-populated by
// optionalAuthenticate-style logic — here it's simply absent for anonymous
// callers, same as before.
async function getJob(req, res) {
  try {
    const job = await jobService.getJobById(req.params.id);
    await jobService.assertJobViewAccess(job, req.user ? req.user.id : null, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(404).json({ success: false, message: "Job not found." });
  }
}

async function listJobs(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.startupId) {
      filter.startup = req.query.startupId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [{ title: regex }, { description: regex }, { department: regex }];
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const jobs = await jobService.listJobsForUser(req.user ? req.user.id : null, filter, options);
    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateJob(req, res) {
  try {
    const job = await jobService.updateJob(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "job.update", job._id, { fields: Object.keys(req.body) });
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function archiveJob(req, res) {
  try {
    const job = await jobService.archiveJob(req.params.id, req.user.id, { isAdmin: isPlatformAdmin(req) });
    logAction(req, "job.archive", job._id, {});
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function restoreJob(req, res) {
  try {
    const job = await jobService.restoreJob(req.params.id, req.user.id, { isAdmin: isPlatformAdmin(req) });
    logAction(req, "job.restore", job._id, {});
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function publishJob(req, res) {
  try {
    const job = await jobService.publishJob(req.params.id, req.user.id, { isAdmin: isPlatformAdmin(req) });
    logAction(req, "job.publish", job._id, {});
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function unpublishJob(req, res) {
  try {
    const job = await jobService.unpublishJob(req.params.id, req.user.id, { isAdmin: isPlatformAdmin(req) });
    logAction(req, "job.unpublish", job._id, {});
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function closeJob(req, res) {
  try {
    const job = await jobService.closeJob(req.params.id, req.user.id, { isAdmin: isPlatformAdmin(req) });
    logAction(req, "job.close", job._id, {});
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createJob,
  getJob,
  listJobs,
  updateJob,
  archiveJob,
  restoreJob,
  publishJob,
  unpublishJob,
  closeJob,
};
