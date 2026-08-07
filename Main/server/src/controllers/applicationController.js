const applicationService = require("../services/applicationService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

function isPlatformAdmin(req) {
  return req.user.role === "admin";
}

function statusOf(error, fallback = 400) {
  return error instanceof ApiError ? error.statusCode : fallback;
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Application", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createApplication(req, res) {
  try {
    if (!req.file) {
      throw new ApiError(400, "A resume file is required.");
    }

    const application = await applicationService.createApplication(
      {
        jobId: req.body.jobId,
        coverLetter: req.body.coverLetter,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalFileName: req.file.originalname,
      },
      req.user.id
    );
    logAction(req, "application.create", application._id, { jobId: req.body.jobId });
    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function getApplication(req, res) {
  try {
    const application = await applicationService.getApplicationForViewer(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(statusOf(error, 403)).json({ success: false, message: error.message });
  }
}

async function listApplications(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.jobId) {
      filter.job = req.query.jobId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const applications = await applicationService.listApplicationsForUser(req.user.id, filter, options, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: applications });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateResume(req, res) {
  try {
    if (!req.file) {
      throw new ApiError(400, "A resume file is required.");
    }
    const application = await applicationService.updateResume(req.params.id, req.user.id, {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalFileName: req.file.originalname,
    });
    logAction(req, "application.update_resume", application._id, {});
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateCoverLetter(req, res) {
  try {
    const application = await applicationService.updateCoverLetter(
      req.params.id,
      req.user.id,
      req.body.coverLetter
    );
    logAction(req, "application.update_cover_letter", application._id, {});
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const application = await applicationService.updateStatus(
      req.params.id,
      req.user.id,
      { status: req.body.status, notes: req.body.notes },
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "application.update_status", application._id, { status: req.body.status });
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function withdraw(req, res) {
  try {
    const application = await applicationService.withdraw(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "application.withdraw", application._id, {});
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createApplication,
  getApplication,
  listApplications,
  updateResume,
  updateCoverLetter,
  updateStatus,
  withdraw,
};
