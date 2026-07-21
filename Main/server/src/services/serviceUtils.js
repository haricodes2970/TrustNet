function normalizeFilter(filter) {
  if (!filter) {
    return {};
  }

  if (typeof filter === "string") {
    try {
      return JSON.parse(filter);
    } catch (error) {
      return {};
    }
  }

  return filter;
}

function applyQueryOptions(query, options = {}) {
  if (options.sort) {
    query.sort(options.sort);
  }

  if (options.limit) {
    query.limit(Number(options.limit));
  }

  if (options.skip) {
    query.skip(Number(options.skip));
  }

  return query;
}

function handleServiceError(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error;
  }

  return new Error(fallbackMessage);
}

function assertOwner(resourceOwnerId, userId, message, statusCode) {
  if (String(resourceOwnerId) !== String(userId)) {
    if (statusCode) {
      const ApiError = require("../utils/ApiError");
      throw new ApiError(statusCode, message);
    }
    throw new Error(message);
  }
}

// Pure, database-independent: workspace-level role ('owner'/'admin') always
// grants mutation rights; a 'contributor' may only mutate a resource they
// created or are assigned to. Reusable by any resource shaped with
// createdBy/assignedTo fields (Tasks today, expected reuse by future
// collaboration modules) — does not itself resolve workspace role, callers
// must supply it from workspaceService.resolveWorkspaceAccess().
function canMutateTask(task, userId, workspaceRole) {
  if (workspaceRole === "owner" || workspaceRole === "admin") {
    return true;
  }
  if (workspaceRole === "contributor") {
    const isCreator = task.createdBy && String(task.createdBy) === String(userId);
    const isAssignee = task.assignedTo && String(task.assignedTo) === String(userId);
    return Boolean(isCreator || isAssignee);
  }
  return false;
}

module.exports = {
  normalizeFilter,
  applyQueryOptions,
  handleServiceError,
  assertOwner,
  canMutateTask,
};
