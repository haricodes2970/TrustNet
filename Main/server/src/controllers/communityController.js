const communityService = require("../services/communityService");

async function createCommunity(req, res) {
  try {
    const data = { ...req.body, owner: req.user.id };
    const community = await communityService.createCommunity(data);
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
    const existing = await communityService.getCommunityById(req.params.id);
    if (String(existing.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this community." });
    }

    const updateData = { ...req.body };
    delete updateData.owner;
    delete updateData.members;
    delete updateData.memberCount;

    const community = await communityService.updateCommunity(req.params.id, updateData);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteCommunity(req, res) {
  try {
    const existing = await communityService.getCommunityById(req.params.id);
    if (String(existing.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this community." });
    }

    const community = await communityService.deleteCommunity(req.params.id);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function joinCommunity(req, res) {
  try {
    const community = await communityService.joinCommunity(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function leaveCommunity(req, res) {
  try {
    const community = await communityService.leaveCommunity(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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
  joinCommunity,
  leaveCommunity,
  listCommunities,
};
