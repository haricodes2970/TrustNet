const User = require("../models/User");
const Startup = require("../models/Startup");
const Community = require("../models/Community");
const Post = require("../models/Post");

const RESULT_LIMIT = 10;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(term) {
  return new RegExp(escapeRegex(term), "i");
}

async function searchUsers(term) {
  return User.find({
    isActive: true,
    $or: [
      { fullName: buildRegex(term) },
      { username: buildRegex(term) },
    ],
  })
    .limit(RESULT_LIMIT)
    .select("fullName username avatarUrl designation isVerified")
    .lean();
}

async function searchStartups(term) {
  return Startup.find({
    status: "active",
    $or: [
      { name: buildRegex(term) },
      { tagline: buildRegex(term) },
      { category: buildRegex(term) },
    ],
  })
    .limit(RESULT_LIMIT)
    .select("name slug tagline logoUrl category stage")
    .lean();
}

async function searchCommunities(term) {
  return Community.find({
    isActive: true,
    $or: [
      { name: buildRegex(term) },
      { description: buildRegex(term) },
      { category: buildRegex(term) },
    ],
  })
    .limit(RESULT_LIMIT)
    .select("name slug description category memberCount coverImageUrl")
    .lean();
}

async function searchPosts(term) {
  return Post.find({
    visibility: "public",
    $or: [
      { title: buildRegex(term) },
      { content: buildRegex(term) },
      { tags: buildRegex(term) },
    ],
  })
    .limit(RESULT_LIMIT)
    .select("title content author postType likeCount commentCount createdAt")
    .lean();
}

async function globalSearch(query) {
  const term = (query || "").trim();

  if (!term) {
    return { users: [], startups: [], communities: [], posts: [] };
  }

  const [users, startups, communities, posts] = await Promise.all([
    searchUsers(term),
    searchStartups(term),
    searchCommunities(term),
    searchPosts(term),
  ]);

  return { users, startups, communities, posts };
}

module.exports = { globalSearch };
