const communityService = require("../services/communityService");

async function createCommunity(req, res) {
  try {
    const community = await communityService.createCommunity(req.body);
    return res.status(201).json({ success: true, data: community });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getCommunity(req, res) {
  try {
    const community = await communityService.getCommunityById(req.params.id);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function getCommunityBySlug(req, res) {
  try {
    const community = await communityService.getCommunityBySlug(req.params.slug);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function updateCommunity(req, res) {
  try {
    const community = await communityService.updateCommunity(req.params.id, req.body);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteCommunity(req, res) {
  try {
    const community = await communityService.deleteCommunity(req.params.id);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function listCommunities(req, res) {
  try {
    const communities = await communityService.listCommunities(req.query.filter || {}, req.query.options || {});
    return res.status(200).json({ success: true, data: communities });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createCommunity,
  getCommunity,
  getCommunityBySlug,
  updateCommunity,
  deleteCommunity,
  listCommunities,
};
