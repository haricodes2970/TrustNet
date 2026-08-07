const Document = require("../models/Document");
const ApiError = require("../utils/ApiError");
const projectService = require("./projectService");
const workspaceService = require("./workspaceService");
const storageService = require("./storageService");
const { applyQueryOptions, handleServiceError, normalizeFilter } = require("./serviceUtils");

// Documents belong to a Project only (never Workspace or Task directly).
// Authorization is resolved exclusively through
// workspaceService.resolveWorkspaceAccess() via the parent Project — same
// foundation-reuse chain Task/Milestone use, no new authority introduced.
//
// canMutateDocument() (below) is a dedicated helper, NOT a reuse of
// canMutateTask() — Documents have no `assignedTo` concept, only
// `createdBy` (the uploader). Kept document-specific by explicit design
// decision rather than folded into serviceUtils.js alongside canMutateTask.

// Pure, database-independent. Owner/admin may mutate any document;
// contributor may mutate only a document they uploaded.
function canMutateDocument(document, userId, workspaceRole) {
  if (workspaceRole === "owner" || workspaceRole === "admin") {
    return true;
  }
  if (workspaceRole === "contributor") {
    return Boolean(document.createdBy && String(document.createdBy) === String(userId));
  }
  return false;
}

async function resolveDocumentAccess(projectId, userId) {
  const project = await projectService.getProjectById(projectId);
  const access = await workspaceService.resolveWorkspaceAccess(project.workspace, userId);
  return { project, access };
}

async function createDocument(
  { projectId, title, description, buffer, mimeType, originalFileName },
  userId,
  { isAdmin = false } = {}
) {
  try {
    const { project, access } = await resolveDocumentAccess(projectId, userId);

    if (!access.role && !isAdmin) {
      throw new ApiError(403, "You are not authorized to upload documents to this project.");
    }
    if (project.isArchived) {
      throw new ApiError(409, "This project is archived and cannot accept new documents.");
    }

    const stored = await storageService.upload({ buffer, mimeType, originalFileName });

    let document;
    try {
      document = await Document.create({
        project: projectId,
        title,
        description: description || "",
        fileName: originalFileName,
        mimeType,
        fileSize: stored.fileSize,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        checksum: stored.checksum,
        createdBy: userId,
      });
    } catch (dbError) {
      // The file already landed in storage before this failed - without
      // cleanup it's orphaned on disk forever with no DB record pointing
      // to it. Best-effort: a cleanup failure must not mask the original
      // DB error the caller actually needs to see.
      await storageService.remove(stored.storageProvider, stored.storageKey).catch(() => {});
      throw dbError;
    }

    return document.toObject();
  } catch (error) {
    throw handleServiceError(error, "Failed to upload document.");
  }
}

async function getDocumentById(id) {
  try {
    const document = await Document.findById(id).lean();
    if (!document) {
      throw new ApiError(404, "Document not found.");
    }
    return document;
  } catch (error) {
    throw handleServiceError(error, "Failed to fetch document.");
  }
}

async function assertDocumentViewAccess(document, userId, { isAdmin = false } = {}) {
  if (isAdmin) {
    return { role: "admin" };
  }
  const { access } = await resolveDocumentAccess(document.project, userId);
  if (!access.role) {
    throw new ApiError(403, "You are not authorized to view this document.");
  }
  return access;
}

// Generates a fresh download URL for an already-access-checked document.
// Never persisted — computed on demand via storageService.
async function getDownloadUrl(document) {
  try {
    return await storageService.downloadUrl(document.storageProvider, document.storageKey);
  } catch (error) {
    throw handleServiceError(error, "Failed to generate a download URL for this document.");
  }
}

// isArchived defaults to excluded (override-friendly, same pattern as
// Project/Task/Milestone's listing defaults). `search` does a case-
// insensitive title/description match, same shape as the other modules.
async function listDocumentsForUser(userId, filter = {}, options = {}) {
  try {
    const { search, ...rest } = normalizeFilter(filter);
    const base = { isArchived: false, ...rest };

    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      base.$or = [{ title: regex }, { description: regex }];
    }

    if (base.project) {
      // A specific project was requested — verify access rather than trusting the caller's filter.
      const { access } = await resolveDocumentAccess(base.project, userId);
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to view documents in this project.");
      }
    } else {
      const projects = await projectService.listProjectsForUser(userId, {}, {});
      base.project = { $in: projects.map((project) => project._id) };
    }

    const query = Document.find(base);
    return applyQueryOptions(query, options).lean();
  } catch (error) {
    throw handleServiceError(error, "Failed to list documents.");
  }
}

async function updateDocument(id, userId, updateData, { isAdmin = false } = {}) {
  try {
    const existing = await getDocumentById(id);
    const { project, access } = await resolveDocumentAccess(existing.project, userId);

    if (!isAdmin) {
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to update this document.");
      }
      if (!canMutateDocument(existing, userId, access.role)) {
        throw new ApiError(403, "You are not authorized to update this document.");
      }
    }
    if (existing.isArchived) {
      throw new ApiError(409, "This document is archived. Restore it before making changes.");
    }
    if (project.isArchived) {
      throw new ApiError(409, "This project is archived. Restore it before updating its documents.");
    }

    // Metadata-only update — title/description. The file itself, its
    // storage location, and its integrity fields are immutable after upload.
    const safeUpdate = {};
    if (Object.prototype.hasOwnProperty.call(updateData, "title")) {
      safeUpdate.title = updateData.title;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "description")) {
      safeUpdate.description = updateData.description;
    }
    safeUpdate.updatedBy = userId;

    const document = await Document.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!document) {
      throw new ApiError(404, "Document not found.");
    }

    return document;
  } catch (error) {
    throw handleServiceError(error, "Failed to update document.");
  }
}

async function archiveDocument(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getDocumentById(id);
    const { access } = await resolveDocumentAccess(existing.project, userId);

    if (!isAdmin) {
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to archive this document.");
      }
      if (!canMutateDocument(existing, userId, access.role)) {
        throw new ApiError(403, "You are not authorized to archive this document.");
      }
    }

    const document = await Document.findByIdAndUpdate(
      id,
      { isArchived: true, updatedBy: userId },
      { new: true }
    ).lean();

    if (!document) {
      throw new ApiError(404, "Document not found.");
    }

    return document;
  } catch (error) {
    throw handleServiceError(error, "Failed to archive document.");
  }
}

async function restoreDocument(id, userId, { isAdmin = false } = {}) {
  try {
    const existing = await getDocumentById(id);
    const { project, access } = await resolveDocumentAccess(existing.project, userId);

    if (!isAdmin) {
      if (!access.role) {
        throw new ApiError(403, "You are not authorized to restore this document.");
      }
      if (!canMutateDocument(existing, userId, access.role)) {
        throw new ApiError(403, "You are not authorized to restore this document.");
      }
    }
    if (project.isArchived) {
      throw new ApiError(409, "Restore the parent project before restoring its documents.");
    }

    const document = await Document.findByIdAndUpdate(
      id,
      { isArchived: false, updatedBy: userId },
      { new: true }
    ).lean();

    if (!document) {
      throw new ApiError(404, "Document not found.");
    }

    return document;
  } catch (error) {
    throw handleServiceError(error, "Failed to restore document.");
  }
}

module.exports = {
  canMutateDocument,
  createDocument,
  getDocumentById,
  assertDocumentViewAccess,
  getDownloadUrl,
  listDocumentsForUser,
  updateDocument,
  archiveDocument,
  restoreDocument,
};
