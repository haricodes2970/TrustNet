const serviceListingService = require("../services/serviceListingService");
const ApiError = require("../utils/ApiError");

// Controllers stay thin: parse req, call service, shape response. Services
// own error typing (ApiError with a statusCode) — the fallback below only
// fires for a genuinely unexpected (non-ApiError) failure.

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
    return res.status(201).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function getListing(req, res) {
  try {
    const listing = await serviceListingService.getListingForViewer(req.params.id, req.user ? req.user.id : null);
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
    const listings = await serviceListingService.listListingsForUser(
      req.user ? req.user.id : null,
      filter,
      req.query.options || {}
    );
    return res.status(200).json({ success: true, data: listings });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function updateListing(req, res) {
  try {
    const listing = await serviceListingService.updateListing(req.params.id, req.user.id, req.body);
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function archiveListing(req, res) {
  try {
    const listing = await serviceListingService.archiveListing(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function publishListing(req, res) {
  try {
    const listing = await serviceListingService.publishListing(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

async function unpublishListing(req, res) {
  try {
    const listing = await serviceListingService.unpublishListing(req.params.id, req.user.id);
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
  publishListing,
  unpublishListing,
};
