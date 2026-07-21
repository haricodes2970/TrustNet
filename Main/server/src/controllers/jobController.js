const jobService = require("../services/jobService");

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
      req.user.id
    );
    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

// Deliberately always 404 on any denial — concealing existence of
// unpublished jobs from unauthorized/anonymous viewers, not just their
// content. This is a deliberate exception to the 403-on-no-access
// convention every other module in this repo follows; see
// docs/modules/hiring.md.
async function getJob(req, res) {
  try {
    const job = await jobService.getJobById(req.params.id);
    await jobService.assertJobViewAccess(job, req.user ? req.user.id : null);
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
    const jobs = await jobService.listJobsForUser(
      req.user ? req.user.id : null,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateJob(req, res) {
  try {
    const job = await jobService.updateJob(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function archiveJob(req, res) {
  try {
    const job = await jobService.archiveJob(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function publishJob(req, res) {
  try {
    const job = await jobService.publishJob(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function unpublishJob(req, res) {
  try {
    const job = await jobService.unpublishJob(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createJob,
  getJob,
  listJobs,
  updateJob,
  archiveJob,
  publishJob,
  unpublishJob,
};
