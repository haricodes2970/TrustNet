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

// Phase 17 (final audit): this helper previously applied NO limit at all
// when the caller didn't pass one, and no upper bound when they did - so
// every list endpoint across the ~23 services that use it would return an
// entire collection by default, and `?limit=1000000` was honoured
// verbatim. That is an unbounded query and an unbounded response payload
// on user-controlled input.
//
// A default page size is now always applied, and an explicit limit is
// clamped to MAX_LIMIT. Safe to apply centrally: no caller sums or
// aggregates over the returned array (analytics uses real aggregate()
// pipelines, and funding totals use an atomic $inc), so a page cap cannot
// silently corrupt a computed total.
const DEFAULT_QUERY_LIMIT = 100;
const MAX_QUERY_LIMIT = 200;

function clampQueryLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_QUERY_LIMIT;
  }
  return Math.min(Math.floor(parsed), MAX_QUERY_LIMIT);
}

function applyQueryOptions(query, options = {}) {
  if (options.sort) {
    query.sort(options.sort);
  }

  query.limit(clampQueryLimit(options.limit));

  if (options.skip) {
    const skip = Number(options.skip);
    if (Number.isFinite(skip) && skip > 0) {
      query.skip(Math.floor(skip));
    }
  }

  return query;
}

// Phase 17 (final audit): raw Mongoose errors were reaching API consumers
// verbatim - a malformed :id produced
// `Cast to ObjectId failed for value "abc" (type string) at path "_id" for
// model "Project"`, leaking internal model names and query internals, with
// an inconsistent status code per module (404/500/403 for the same class of
// input). Mongoose's own error types are normalized here, at the single
// choke point almost every service already funnels through, so no
// per-module changes are needed:
//   CastError      -> 400 "Invalid ID." (a malformed id is a bad request)
//   ValidationError -> 400 with the field messages only, not the raw dump
//   duplicate key   -> 409
// ApiError instances pass through untouched - services that already chose a
// deliberate status code keep it. The central errorHandler applies the same
// normalization for anything that reaches it via next(error) instead.
function normalizeMongooseError(error) {
  const ApiError = require("../utils/ApiError");

  if (error instanceof ApiError) {
    return error;
  }

  if (error && error.name === "CastError") {
    return new ApiError(400, error.path === "_id" ? "Invalid ID." : `Invalid value for "${error.path}".`);
  }

  if (error && error.name === "ValidationError") {
    const details = Object.values(error.errors || {})
      .map((e) => e.message)
      .filter(Boolean);
    return new ApiError(400, details.length ? details.join(" ") : "Validation failed.");
  }

  if (error && error.code === 11000) {
    return new ApiError(409, "That record already exists.");
  }

  return null;
}

function handleServiceError(error, fallbackMessage) {
  const normalized = normalizeMongooseError(error);
  if (normalized) {
    return normalized;
  }

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
  clampQueryLimit,
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_LIMIT,
  handleServiceError,
  normalizeMongooseError,
  assertOwner,
  canMutateTask,
};
