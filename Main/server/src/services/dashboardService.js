const userService = require("./userService");
const startupService = require("./startupService");
const communityService = require("./communityService");
const collaborationService = require("./collaborationService");
const postService = require("./postService");

async function getDashboard(email) {
  const user = await userService.getUserByEmail(email);

  const [startups, communities, collaborations, posts, recentStartups] = await Promise.all([
    startupService.listStartups({}, {}),
    communityService.listCommunities({}, {}),
    collaborationService.listCollaborationRequests({}, {}),
    postService.listPosts({}, { limit: 5, sort: "-createdAt" }),
    startupService.listStartups({}, { sort: "-createdAt", limit: 5 }),
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

  const recentStartupsMapped = recentStartups.map((startup) => ({
    _id: startup._id,
    name: startup.name,
    slug: startup.slug,
    tagline: startup.tagline,
    stage: startup.stage,
    logoUrl: startup.logoUrl,
    createdAt: startup.createdAt,
  }));

  return { user, stats, recentActivity, recentStartups: recentStartupsMapped };
}

module.exports = { getDashboard };
