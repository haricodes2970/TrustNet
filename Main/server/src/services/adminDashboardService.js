const User = require("../models/User");
const Startup = require("../models/Startup");
const Community = require("../models/Community");
const Post = require("../models/Post");
const Job = require("../models/Job");
const FundingRound = require("../models/FundingRound");
const ServiceListing = require("../models/ServiceListing");
const auditLogService = require("./auditLogService");
const { handleServiceError } = require("./serviceUtils");

// Also serves the "Reports > platform statistics" objective - deliberately
// not duplicated into a separate reports service/endpoint.
async function getOverview() {
  try {
    const [
      totalUsers,
      verifiedUsers,
      pendingVerifications,
      totalStartups,
      totalCommunities,
      totalPosts,
      totalJobs,
      totalFundingRounds,
      totalMarketplaceListings,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ deletedAt: null, isVerified: true }),
      User.countDocuments({ deletedAt: null, verificationStatus: "pending" }),
      Startup.countDocuments({}),
      Community.countDocuments({}),
      Post.countDocuments({}),
      Job.countDocuments({}),
      FundingRound.countDocuments({}),
      ServiceListing.countDocuments({}),
      auditLogService.listLogs({}, { limit: 10 }),
    ]);

    return {
      totals: {
        users: totalUsers,
        verifiedUsers,
        pendingVerifications,
        startups: totalStartups,
        communities: totalCommunities,
        posts: totalPosts,
        jobs: totalJobs,
        fundingRounds: totalFundingRounds,
        marketplaceListings: totalMarketplaceListings,
      },
      recentActivity,
    };
  } catch (error) {
    throw handleServiceError(error, "Failed to load dashboard overview.");
  }
}

module.exports = { getOverview };
