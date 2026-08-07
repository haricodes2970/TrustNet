const serviceListingService = require("../services/serviceListingService");
const auditLogService = require("../services/auditLogService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

function isPlatformAdmin(req) {
  return Boolean(req.user) && req.user.role === "admin";
}

function logAction(req, action, targetId, details) {
  auditLogService
    .createLog({ actor: req.user.id, action, targetType: "ServiceListing", targetId, details, ip: req.ip })
    .catch((error) => {
      console.error(`[audit] Failed to log "${action}" by ${req.user.id}: ${error.message}`);
    });
}

async function createListing(req, res) {
  try {
    const listing = await serviceListingService.createListing(
      {
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        pricingModel: req.body.pricingModel,
        priceMin: req.body.priceMin,
        priceMax: req.body.priceMax,
        currency: req.body.currency,
        tags: req.body.tags,
      },
      req.user.id
    );
    logAction(req, "serviceListing.create", listing._id, {});
    return res.status(201).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getListing(req, res) {
  try {
    const listing = await serviceListingService.getListingForViewer(req.params.id, req.user ? req.user.id : null, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function listListings(req, res) {
  try {
    const filter = { ...(req.query.filter || {}) };
    if (req.query.providerId) {
      filter.provider = req.query.providerId;
    }
    if (req.query.search) {
      filter.search = req.query.search;
    }
    const options = { ...(req.query.options || {}) };
    if (req.query.limit !== undefined) options.limit = req.query.limit;
    if (req.query.skip !== undefined) options.skip = req.query.skip;
    if (req.query.sort !== undefined) options.sort = req.query.sort;

    const listings = await serviceListingService.listListingsForUser(req.user ? req.user.id : null, filter, options, {
      isAdmin: isPlatformAdmin(req),
    });
    return res.status(200).json({ success: true, data: listings });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateListing(req, res) {
  try {
    const listing = await serviceListingService.updateListing(req.params.id, req.user.id, req.body, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "serviceListing.update", listing._id, {});
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveListing(req, res) {
  try {
    const listing = await serviceListingService.archiveListing(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "serviceListing.archive", listing._id, {});
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function restoreListing(req, res) {
  try {
    const listing = await serviceListingService.restoreListing(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "serviceListing.restore", listing._id, {});
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function publishListing(req, res) {
  try {
    const listing = await serviceListingService.publishListing(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "serviceListing.publish", listing._id, {});
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function unpublishListing(req, res) {
  try {
    const listing = await serviceListingService.unpublishListing(req.params.id, req.user.id, {
      isAdmin: isPlatformAdmin(req),
    });
    logAction(req, "serviceListing.unpublish", listing._id, {});
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

module.exports = {
  createListing,
  getListing,
  listListings,
  updateListing,
  archiveListing,
  restoreListing,
  publishListing,
  unpublishListing,
};
