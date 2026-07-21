const userService = require("./userService");
const startupService = require("./startupService");
const communityService = require("./communityService");
const collaborationService = require("./collaborationService");
const postService = require("./postService");

async function getDashboard(email) {
  const user = await userService.getUserByEmail(email);

  const [
    startups,
    communities,
    collaborations,
    posts,
    recentStartups,
    trendingPosts,
    suggestedCommunities,
    suggestedPeople,
  ] = await Promise.all([
    startupService.listStartups({}, {}),
    communityService.listCommunities({}, {}),
    collaborationService.listCollaborationRequests({}, {}),
    postService.listPosts({}, { limit: 5, sort: "-createdAt" }),
    startupService.listStartups({}, { sort: "-createdAt", limit: 5 }),
    postService.listPosts(
      {},
      {
        sort: "-likeCount",
        limit: 5,
      }
    ),
    communityService.listCommunities({}, { sort: "-memberCount", limit: 5 }),
    userService.listUsers(
      { _id: { $ne: user._id }, role: { $ne: "admin" }, isActive: true },
      { sort: "-followersCount", limit: 5 }
    ),
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

  const trendingPostsMapped = trendingPosts.map((post) => {
    const content = post.content || "";
    const excerpt = content.length > 180 ? `${content.slice(0, 180).trimEnd()}…` : content;

    return {
      _id: post._id,
      title: post.title || "",
      excerpt,
      postType: post.postType,
      likeCount: post.likeCount,
      author: post.author,
      createdAt: post.createdAt,
    };
  });

  const suggestedCommunitiesMapped = suggestedCommunities.map((community) => ({
    _id: community._id,
    name: community.name,
    slug: community.slug,
    description: community.description,
    logoUrl: community.coverImageUrl,
    memberCount: community.memberCount,
    createdAt: community.createdAt,
  }));

  const suggestedPeopleMapped = suggestedPeople.map((person) => ({
    _id: person._id,
    fullName: person.fullName,
    username: person.username,
    avatarUrl: person.avatarUrl,
    designation: person.designation,
    isVerified: person.isVerified,
    followersCount: person.followersCount,
  }));

  return {
    user,
    stats,
    recentActivity,
    recentStartups: recentStartupsMapped,
    trendingPosts: trendingPostsMapped,
    suggestedCommunities: suggestedCommunitiesMapped,
    suggestedPeople: suggestedPeopleMapped,
  };
}

module.exports = { getDashboard };
