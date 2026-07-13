const userService = require("./userService");
const startupService = require("./startupService");
const communityService = require("./communityService");
const collaborationService = require("./collaborationService");
const postService = require("./postService");

// The mock auth layer keeps users in memory and never persists them, so the
// identity from the token may not yet exist in MongoDB. Resolve it to a profile
// document on first use, mirroring how the profile module behaves.
async function getOrCreateUser(email) {
  try {
    return await userService.getUserByEmail(email);
  } catch (err) {
    const local = String(email).split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_") || "user";
    return userService.createUser({
      email,
      username: `${local}_${Math.random().toString(36).slice(2, 8)}`,
      fullName: local,
    });
  }
}

async function getDashboard(email) {
  const user = await getOrCreateUser(email);

  const [startups, communities, collaborations, posts] = await Promise.all([
    startupService.listStartups({}, {}),
    communityService.listCommunities({}, {}),
    collaborationService.listCollaborationRequests({}, {}),
    postService.listPosts({}, { limit: 5, sort: "-createdAt" }),
  ]);

  const stats = {
    startups: startups.length,
    communities: communities.length,
    collaborations: collaborations.length,
    posts: posts.length,
  };

  const recentActivity = posts.map((post) => ({
    id: post._id,
    type: "post",
    title: post.title || "",
    content: post.content,
    postType: post.postType,
    author: post.author,
    createdAt: post.createdAt,
  }));

  return { user, stats, recentActivity };
}

module.exports = { getDashboard };
