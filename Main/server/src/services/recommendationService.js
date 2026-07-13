const Startup = require("../models/Startup");
const Community = require("../models/Community");
const User = require("../models/User");
const Post = require("../models/Post");
const userService = require("./userService");

const MAX_PER_SECTION = 10;

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

async function getRecommendations(email) {
  let currentUser = null;
  try {
    currentUser = email ? await userService.getUserByEmail(email) : null;
  } catch (err) {
    currentUser = null;
  }
  const excludeUserId = currentUser?._id;

  const [startups, communities, users, newestPosts, likedPosts] = await Promise.all([
    Startup.find({ status: "active", isPublic: true })
      .sort("-createdAt")
      .limit(MAX_PER_SECTION)
      .lean(),
    Community.find({ isActive: true })
      .sort("-memberCount")
      .limit(MAX_PER_SECTION)
      .lean(),
    User.find({ isActive: true })
      .sort("-createdAt")
      .limit(MAX_PER_SECTION + 1)
      .lean()
      .then((docs) =>
        docs
          .filter((u) => !excludeUserId || String(u._id) !== String(excludeUserId))
          .slice(0, MAX_PER_SECTION)
      ),
    Post.find({ visibility: "public" })
      .sort("-createdAt")
      .limit(MAX_PER_SECTION)
      .populate("author", "fullName username avatarUrl")
      .lean(),
    Post.find({ visibility: "public" })
      .sort("-likeCount")
      .limit(MAX_PER_SECTION)
      .populate("author", "fullName username avatarUrl")
      .lean(),
  ]);

  const posts = dedupeById([...newestPosts, ...likedPosts]).slice(0, MAX_PER_SECTION);

  return { startups, communities, users, posts };
}

module.exports = { getRecommendations };
