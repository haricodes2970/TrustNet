const userService = require("./userService");
const startupService = require("./startupService");
const communityService = require("./communityService");
const collaborationService = require("./collaborationService");
const postService = require("./postService");

async function getDashboard(email) {
  const user = await userService.getUserByEmail(email);

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
