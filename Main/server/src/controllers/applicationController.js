const applicationService = require("../services/applicationService");
const ApiError = require("../utils/ApiError");

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
    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getApplication(req, res) {
  try {
    const application = await applicationService.getApplicationForViewer(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 403;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listApplications(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.jobId) {
      filter.job = req.query.jobId;
    }
    const applications = await applicationService.listApplicationsForUser(
      req.user.id,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: applications });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateCoverLetter(req, res) {
  try {
    const application = await applicationService.updateCoverLetter(
      req.params.id,
      req.user.id,
      req.body.coverLetter
    );
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const application = await applicationService.updateStatus(req.params.id, req.user.id, {
      status: req.body.status,
      notes: req.body.notes,
    });
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function withdraw(req, res) {
  try {
    const application = await applicationService.withdraw(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
