const documentService = require("../services/documentService");
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
    .createLog({ actor: req.user.id, action, targetType: "Document", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createDocument(req, res) {
  try {
    if (!req.file) {
      throw new ApiError(400, "A file is required.");
    }

    const document = await documentService.createDocument(
      {
        projectId: req.body.projectId,
        title: req.body.title,
        description: req.body.description,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalFileName: req.file.originalname,
      },
      req.user.id,
      { isAdmin: isPlatformAdmin(req) }
    );
    logAction(req, "document.create", document._id, { projectId: req.body.projectId, title: document.title });
    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function getDocument(req, res) {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    await documentService.assertDocumentViewAccess(document, req.user.id, { isAdmin: isPlatformAdmin(req) });
    const url = await documentService.getDownloadUrl(document);
    return res.status(200).json({ success: true, data: { ...document, url } });
  } catch (error) {
    return res.status(statusOf(error, 404)).json({ success: false, message: error.message });
  }
}

async function listDocuments(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.projectId) {
      filter.project = req.query.projectId;
    }
    if (req.query.search) {
      filter.search = req.query.search;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const documents = await documentService.listDocumentsForUser(req.user.id, filter, options);
    return res.status(200).json({ success: true, data: documents });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function updateDocument(req, res) {
  try {
    const document = await documentService.updateDocument(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "document.update", document._id, { fields: Object.keys(req.body) });
    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function archiveDocument(req, res) {
  try {
    const document = await documentService.archiveDocument(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "document.archive", document._id, {});
    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

async function restoreDocument(req, res) {
  try {
    const document = await documentService.restoreDocument(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "document.restore", document._id, {});
    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    return res.status(statusOf(error)).json({ success: false, message: error.message });
  }
}

module.exports = {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  archiveDocument,
  restoreDocument,
};
