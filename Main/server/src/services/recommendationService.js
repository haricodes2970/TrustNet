const Startup = require("../models/Startup");
const Community = require("../models/Community");
const User = require("../models/User");
const Post = require("../models/Post");
const ServiceListing = require("../models/ServiceListing");
const providerProfileService = require("./providerProfileService");

const MAX_PER_SECTION = 10;

// No user-blocking feature exists in this codebase (Developer 1's `Block`
// model was explicitly not adopted - see BACKLOG.md's "Backend merge"
// section), so there is no "blocked content" state to filter here. Noted
// for the record rather than silently skipped.

function dedupeById(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const id = String(item._id);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

async function getRecommendations(userId) {
  const excludeUserId = userId || null;

  const [startups, communities, users, newestPosts, likedPosts, listings] = await Promise.all([
    // isSuspended/deletedAt were missing entirely - a suspended or
    // soft-deleted startup could be recommended despite being excluded
    // from every other public surface (listStartups, search).
    Startup.find({ status: "active", isPublic: true, isSuspended: false, deletedAt: null })
      .sort("-createdAt")
      .limit(MAX_PER_SECTION)
      .lean(),
    // isHidden/deletedAt were missing entirely - an admin-hidden or
    // deleted community could be recommended.
    Community.find({ isActive: true, isHidden: false, deletedAt: null })
      .sort("-memberCount")
      .limit(MAX_PER_SECTION)
      .lean(),
    // deletedAt was missing - relied only on isActive:false also being set
    // by softDeleteUser today, which happens to hold but isn't guaranteed
    // by the schema; checked explicitly here like everywhere else in this
    // codebase.
    User.find({ isActive: true, deletedAt: null })
      .sort("-createdAt")
      .limit(MAX_PER_SECTION + 1)
      .lean()
      .then((docs) =>
        docs
          .filter((u) => !excludeUserId || String(u._id) !== String(excludeUserId))
          .slice(0, MAX_PER_SECTION)
      ),
    // isHidden/deletedAt were missing - a hidden or deleted post could
    // surface in "newest"/"trending" recommendations.
    Post.find({ visibility: "public", isHidden: false, deletedAt: null })
      .sort("-createdAt")
      .limit(MAX_PER_SECTION)
      .populate("author", "fullName username avatarUrl")
      .lean(),
    Post.find({ visibility: "public", isHidden: false, deletedAt: null })
      .sort("-likeCount")
      .limit(MAX_PER_SECTION)
      .populate("author", "fullName username avatarUrl")
      .lean(),
    // New this phase - "Marketplace recommendations (if implemented)".
    // Mirrors searchServiceListings' public-subset rules exactly (reuses
    // providerProfileService.listInactiveProviderIds, not duplicated).
    providerProfileService.listInactiveProviderIds().then((inactiveProviderIds) =>
      ServiceListing.find({
        status: "published",
        isArchived: false,
        isHidden: false,
        deletedAt: null,
        provider: { $nin: inactiveProviderIds },
      })
        .sort("-createdAt")
        .limit(MAX_PER_SECTION)
        .lean()
    ),
  ]);

  const posts = dedupeById([...newestPosts, ...likedPosts]).slice(0, MAX_PER_SECTION);

  return { startups, communities, users, posts, listings };
}

module.exports = { getRecommendations };
