const userService = require("./userService");
const { handleServiceError } = require("./serviceUtils");
const ApiError = require("../utils/ApiError");

const ROLES = ["founder", "entrepreneur", "investor", "client", "mentor", "builder", "admin"];

// Composes search/filter/pagination on top of userService.listUsers/countUsers
// rather than duplicating query logic. Soft-deleted users are excluded
// unless the caller explicitly asks to include them.
function buildFilter({ search, role, verificationStatus, isActive, includeDeleted }) {
  const filter = {};

  if (!includeDeleted) {
    filter.deletedAt = null;
  }
  if (role) {
    filter.role = role;
  }
  if (verificationStatus) {
    filter.verificationStatus = verificationStatus;
  }
  if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === true;
  }
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: regex }, { username: regex }, { email: regex }];
  }

  return filter;
}

async function listUsers(query = {}) {
  try {
    const filter = buildFilter(query);
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = query.skip ? Number(query.skip) : 0;

    const [users, total] = await Promise.all([
      userService.listUsers(filter, { sort: { createdAt: -1 }, limit, skip }),
      userService.countUsers(filter),
    ]);

    return { users, total, limit, skip };
  } catch (error) {
    throw handleServiceError(error, "Failed to list users.");
  }
}

function assertNotSelf(actorId, targetId, message) {
  if (String(actorId) === String(targetId)) {
    throw new ApiError(400, message);
  }
}

async function suspendUser(actorId, targetId, reason) {
  assertNotSelf(actorId, targetId, "You cannot suspend your own account.");
  return userService.updateUser(targetId, { isActive: false, suspensionReason: reason || null });
}

async function reactivateUser(targetId) {
  return userService.updateUser(targetId, { isActive: true, suspensionReason: null });
}

async function changeRole(actorId, targetId, role) {
  if (!ROLES.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${ROLES.join(", ")}.`);
  }
  assertNotSelf(actorId, targetId, "You cannot change your own role.");
  return userService.updateUser(targetId, { role });
}

async function softDeleteUser(actorId, targetId) {
  assertNotSelf(actorId, targetId, "You cannot delete your own account.");
  return userService.updateUser(targetId, { deletedAt: new Date(), isActive: false });
}

module.exports = { ROLES, listUsers, suspendUser, reactivateUser, changeRole, softDeleteUser };
