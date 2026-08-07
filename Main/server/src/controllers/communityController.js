const communityService = require("../services/communityService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) - the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

function isPlatformAdmin(req) {
  return Boolean(req.user) && req.user.role === "admin";
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "Community", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createCommunity(req, res) {
  try {
    const data = { ...req.body, owner: req.user.id };
    const community = await communityService.createCommunity(data);
    logAction(req, "community.create", community._id, {});
    return res.status(201).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getCommunity(req, res) {
  try {
    const viewer = req.user ? { id: req.user.id, role: req.user.role } : {};
    const community = await communityService.getCommunityForViewer(req.params.id, viewer);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getCommunityBySlug(req, res) {
  try {
    const viewer = req.user ? { id: req.user.id, role: req.user.role } : {};
    const community = await communityService.getCommunityBySlugForViewer(req.params.slug, viewer);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateCommunity(req, res) {
  try {
    const community = await communityService.updateCommunity(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "community.update", community._id, {});
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function deleteCommunity(req, res) {
  try {
    const community = await communityService.deleteCommunity(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "community.delete", community._id, {});
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreCommunity(req, res) {
  try {
    const community = await communityService.restoreCommunity(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "community.restore", community._id, {});
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function joinCommunity(req, res) {
  try {
    const community = await communityService.joinCommunity(req.params.id, req.user.id);
    logAction(req, "community.join", community._id, {});
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function leaveCommunity(req, res) {
  try {
    const community = await communityService.leaveCommunity(req.params.id, req.user.id);
    logAction(req, "community.leave", community._id, {});
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listCommunities(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.search) {
      filter.search = req.query.search;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const communities = await communityService.listCommunities(filter, options);
    return res.status(200).json({ success: true, data: communities });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createCommunity,
  getCommunity,
  getCommunityBySlug,
  updateCommunity,
  deleteCommunity,
  restoreCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunities,
};
