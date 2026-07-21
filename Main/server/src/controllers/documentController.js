const documentService = require("../services/documentService");
const ApiError = require("../utils/ApiError");

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
      req.user.id
    );
    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getDocument(req, res) {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    await documentService.assertDocumentViewAccess(document, req.user.id);
    const url = await documentService.getDownloadUrl(document);
    return res.status(200).json({ success: true, data: { ...document, url } });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 404;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listDocuments(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.projectId) {
      filter.project = req.query.projectId;
    }
    const documents = await documentService.listDocumentsForUser(
      req.user.id,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: documents });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateDocument(req, res) {
  try {
    const document = await documentService.updateDocument(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveDocument(req, res) {
  try {
    const document = await documentService.archiveDocument(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  archiveDocument,
};
