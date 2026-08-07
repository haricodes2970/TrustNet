const Startup = require("../models/Startup");
const Team = require("../models/Team");
const Workspace = require("../models/Workspace");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Milestone = require("../models/Milestone");
const Job = require("../models/Job");
const Application = require("../models/Application");
const InvestmentInterest = require("../models/InvestmentInterest");
const FundingRound = require("../models/FundingRound");
const FundingContribution = require("../models/FundingContribution");
const ServiceListing = require("../models/ServiceListing");
const EngagementRequest = require("../models/EngagementRequest");
const ApiError = require("../utils/ApiError");
const { handleServiceError } = require("./serviceUtils");

// Analytics is a read-only layer over every other domain — no model of its
// own, no write operations anywhere in this file. Reads collections
// directly rather than going through each domain's own service, since
// there is no business logic to reuse for a pure read (createProject/
// createTask/etc.'s validation and authorization don't apply to counting
// existing documents).
//
// resolveStartupAccess() below is a SIXTH deliberate, known duplication of
// the founder/admin/contributor role-computation logic already implemented
// separately in workspaceService.resolveWorkspaceAccess(),
// jobService.resolveStartupAccess(), investmentInterestService.resolveStartupAccess(),
// fundingRoundService.resolveStartupAccess(), and
// engagementRequestService.resolveStartupAccess(). Not shared with any of
// them by explicit instruction — none of those five files are touched
// here. See docs/modules/analytics.md and BACKLOG.md.
//
// Error typing: 400 missing startupId, 404 startup not found, 403 no role
// on the startup. This is the first fully read-only module — there is no
// 409 conflict class here, since nothing is ever mutated.

async function resolveStartupAccess(startupId, userId) {
  const startup = await Startup.findById(startupId).lean();
  if (!startup) {
    return { role: null };
  }

  if (String(startup.founder) === String(userId)) {
    return { role: "owner" };
  }

  const team = await Team.findOne({ startup: startupId }).lean();
  if (!team) {
    return { role: null };
  }

  const member = team.members.find(
    (m) => m.user && String(m.user) === String(userId) && m.status === "active"
  );

  if (!member) {
    return { role: null };
  }

  return { role: member.role === "admin" ? "admin" : "contributor" };
}

// Every endpoint is read-only and identically gated: any role (owner,
// admin, or contributor) may view. No owner/admin-vs-contributor split
// exists in this module, unlike every prior module, since nothing here is
// ever mutated. Returns the startup document so callers that already need
// it (getOverview, getFundingAnalytics) don't re-fetch it.
async function assertAnyRole(startupId, userId) {
  if (!startupId) {
    throw new ApiError(400, "startupId is required.");
  }

  let startup;
  try {
    startup = await Startup.findById(startupId).lean();
  } catch (error) {
    // A malformed startupId (not a 24-char hex ObjectId) throws a raw
    // Mongoose CastError here, which handleServiceError passes through
    // unchanged (it's a real Error with a message) - the controller then
    // has no ApiError.statusCode to read and falls back to 500, leaking an
    // internal Mongoose message for what is really a 400 bad request. This
    // is the single choke point every Analytics/Reports/AI call goes
    // through, so fixing it here covers all three.
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid startupId.");
    }
    throw error;
  }

  if (!startup) {
    throw new ApiError(404, "Startup not found.");
  }

  const access = await resolveStartupAccess(startupId, userId);
  if (!access.role) {
    throw new ApiError(403, "You are not authorized to view analytics for this startup.");
  }

  return startup;
}

// Pure, database-independent. Converts a Mongo `$group` result
// ([{ _id: status, count }]) into an object with every known enum value
// present and defaulted to 0 — so a Startup with zero activity in a
// domain returns real zeros, not a sparse/missing-key object.
function defaultCounts(enumValues, groupResult) {
  const counts = {};
  for (const value of enumValues) {
    counts[value] = 0;
  }
  for (const entry of groupResult) {
    if (Object.prototype.hasOwnProperty.call(counts, entry._id)) {
      counts[entry._id] = entry.count;
    }
  }
  return counts;
}

function totalOf(counts) {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "archived"];
const MILESTONE_STATUSES = ["planned", "in_progress", "completed", "missed", "archived"];
const TASK_STATUSES = ["todo", "in_progress", "in_review", "done", "archived"];
const JOB_STATUSES = ["draft", "published", "closed"];
const APPLICATION_STATUSES = ["submitted", "under_review", "interview", "offer", "hired", "rejected", "withdrawn"];
const INTEREST_STATUSES = ["submitted", "reviewing", "contacted", "accepted", "declined", "withdrawn"];
const ROUND_STATUSES = ["draft", "open", "closed", "cancelled"];
const CONTRIBUTION_STATUSES = ["pledged", "confirmed", "rejected", "withdrawn"];
const ENGAGEMENT_STATUSES = ["requested", "accepted", "declined", "in_progress", "completed", "cancelled"];

// Internal, auth-free computation — reused by both the dedicated endpoint
// and getOverview() so authorization is checked exactly once per request
// even when overview needs every domain's numbers.
async function computeProjectAnalytics(startupId) {
  const workspace = await Workspace.findOne({ startup: startupId }).lean();
  if (!workspace) {
    return { totalProjects: 0, projectsByStatus: defaultCounts(PROJECT_STATUSES, []), totalMilestones: 0, milestonesByStatus: defaultCounts(MILESTONE_STATUSES, []) };
  }

  const projectGroups = await Project.aggregate([
    { $match: { workspace: workspace._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const projectsByStatus = defaultCounts(PROJECT_STATUSES, projectGroups);

  const projectIds = await Project.find({ workspace: workspace._id }).select("_id").lean();
  const ids = projectIds.map((p) => p._id);

  const milestoneGroups = ids.length
    ? await Milestone.aggregate([{ $match: { project: { $in: ids } } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
    : [];
  const milestonesByStatus = defaultCounts(MILESTONE_STATUSES, milestoneGroups);

  return {
    totalProjects: totalOf(projectsByStatus),
    projectsByStatus,
    totalMilestones: totalOf(milestonesByStatus),
    milestonesByStatus,
  };
}

async function computeTaskAnalytics(startupId) {
  const workspace = await Workspace.findOne({ startup: startupId }).lean();
  if (!workspace) {
    return { totalTasks: 0, tasksByStatus: defaultCounts(TASK_STATUSES, []), completionRate: 0 };
  }

  const projectIds = await Project.find({ workspace: workspace._id }).select("_id").lean();
  const ids = projectIds.map((p) => p._id);

  const taskGroups = ids.length
    ? await Task.aggregate([{ $match: { project: { $in: ids } } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
    : [];
  const tasksByStatus = defaultCounts(TASK_STATUSES, taskGroups);
  const total = totalOf(tasksByStatus);
  const nonArchived = total - tasksByStatus.archived;
  const completionRate = nonArchived > 0 ? Math.round((tasksByStatus.done / nonArchived) * 10000) / 100 : 0;

  return { totalTasks: total, tasksByStatus, completionRate };
}

async function computeHiringAnalytics(startupId) {
  const jobGroups = await Job.aggregate([{ $match: { startup: startupId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
  const jobsByStatus = defaultCounts(JOB_STATUSES, jobGroups);

  const jobIds = await Job.find({ startup: startupId }).select("_id").lean();
  const ids = jobIds.map((j) => j._id);

  const applicationGroups = ids.length
    ? await Application.aggregate([{ $match: { job: { $in: ids } } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
    : [];
  const applicationsByStatus = defaultCounts(APPLICATION_STATUSES, applicationGroups);
  const totalApplications = totalOf(applicationsByStatus);
  const conversionRate =
    totalApplications > 0 ? Math.round((applicationsByStatus.hired / totalApplications) * 10000) / 100 : 0;

  return {
    totalJobs: totalOf(jobsByStatus),
    jobsByStatus,
    totalApplications,
    applicationsByStatus,
    conversionRate,
  };
}

async function computeInvestorAnalytics(startupId) {
  const interestGroups = await InvestmentInterest.aggregate([
    { $match: { startup: startupId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const interestsByStatus = defaultCounts(INTEREST_STATUSES, interestGroups);
  const distinctInvestorIds = await InvestmentInterest.distinct("investor", { startup: startupId });

  return {
    distinctInvestorCount: distinctInvestorIds.length,
    totalInterests: totalOf(interestsByStatus),
    interestsByStatus,
  };
}

async function computeFundingAnalytics(startup) {
  const roundGroups = await FundingRound.aggregate([
    { $match: { startup: startup._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const roundsByStatus = defaultCounts(ROUND_STATUSES, roundGroups);

  const roundIds = await FundingRound.find({ startup: startup._id }).select("_id").lean();
  const ids = roundIds.map((r) => r._id);

  const contributionGroups = ids.length
    ? await FundingContribution.aggregate([
        { $match: { fundingRound: { $in: ids } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
    : [];
  const contributionsByStatus = defaultCounts(CONTRIBUTION_STATUSES, contributionGroups);

  return {
    fundingGoal: startup.fundingGoal || 0,
    fundingRaised: startup.fundingRaised || 0,
    totalRounds: totalOf(roundsByStatus),
    roundsByStatus,
    totalContributions: totalOf(contributionsByStatus),
    contributionsByStatus,
  };
}

async function computeMarketplaceAnalytics(startupId) {
  const requestGroups = await EngagementRequest.aggregate([
    { $match: { startup: startupId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const requestsByStatus = defaultCounts(ENGAGEMENT_STATUSES, requestGroups);

  const listingIds = await EngagementRequest.distinct("serviceListing", { startup: startupId });
  const providerIds = listingIds.length
    ? await ServiceListing.distinct("provider", { _id: { $in: listingIds } })
    : [];

  return {
    totalRequests: totalOf(requestsByStatus),
    requestsByStatus,
    distinctProviderCount: providerIds.length,
  };
}

async function computeTeamSize(startupId) {
  const team = await Team.findOne({ startup: startupId }).lean();
  if (!team) {
    return 0;
  }
  return team.members.filter((m) => m.status === "active").length;
}

// Every getXAnalytics function below passes `startup._id` (a real
// Mongoose ObjectId, already fetched by assertAnyRole) into its compute
// function - never the raw `startupId` route-param string. This matters:
// Model.aggregate()'s `$match` stage does NOT get Mongoose's automatic
// string->ObjectId casting the way `.find()`/`.findOne()` does, so an
// aggregate $match against a string startupId silently matches zero
// documents instead of throwing - a query that looks correct and returns
// a clean, plausible-looking empty result. computeHiringAnalytics,
// computeMarketplaceAnalytics, and computeInvestorAnalytics (via
// getOverview below) all have an aggregate $match on `startup` and were
// hitting exactly this - confirmed empirically (Job.aggregate with a
// string id returns 0 docs against real seeded data, .find() with the
// same string returns 1). The existing unit tests never caught this
// because they call these service functions directly with
// `fx.startup._id` (already a real ObjectId from Startup.create()),
// never with the plain string every real HTTP request actually sends as
// `req.query.startupId`.

async function getProjectAnalytics(startupId, userId) {
  try {
    const startup = await assertAnyRole(startupId, userId);
    return await computeProjectAnalytics(startup._id);
  } catch (error) {
    throw handleServiceError(error, "Failed to compute project analytics.");
  }
}

async function getTaskAnalytics(startupId, userId) {
  try {
    const startup = await assertAnyRole(startupId, userId);
    return await computeTaskAnalytics(startup._id);
  } catch (error) {
    throw handleServiceError(error, "Failed to compute task analytics.");
  }
}

async function getHiringAnalytics(startupId, userId) {
  try {
    const startup = await assertAnyRole(startupId, userId);
    return await computeHiringAnalytics(startup._id);
  } catch (error) {
    throw handleServiceError(error, "Failed to compute hiring analytics.");
  }
}

async function getFundingAnalytics(startupId, userId) {
  try {
    const startup = await assertAnyRole(startupId, userId);
    return await computeFundingAnalytics(startup);
  } catch (error) {
    throw handleServiceError(error, "Failed to compute funding analytics.");
  }
}

async function getMarketplaceAnalytics(startupId, userId) {
  try {
    const startup = await assertAnyRole(startupId, userId);
    return await computeMarketplaceAnalytics(startup._id);
  } catch (error) {
    throw handleServiceError(error, "Failed to compute marketplace analytics.");
  }
}

// Composes every domain's internal compute function after a single
// authorization check — avoids six separate resolveStartupAccess() round
// trips that calling each public getXAnalytics() function individually
// would otherwise incur.
async function getOverview(startupId, userId) {
  try {
    const startup = await assertAnyRole(startupId, userId);

    const [projects, tasks, hiring, investors, funding, marketplace, teamSize] = await Promise.all([
      computeProjectAnalytics(startup._id),
      computeTaskAnalytics(startup._id),
      computeHiringAnalytics(startup._id),
      computeInvestorAnalytics(startup._id),
      computeFundingAnalytics(startup),
      computeMarketplaceAnalytics(startup._id),
      computeTeamSize(startup._id),
    ]);

    return {
      startup: {
        id: startup._id,
        name: startup.name,
        stage: startup.stage,
        status: startup.status,
        fundingGoal: startup.fundingGoal || 0,
        fundingRaised: startup.fundingRaised || 0,
        createdAt: startup.createdAt,
        teamSize,
      },
      projects,
      tasks,
      hiring,
      investors,
      funding,
      marketplace,
    };
  } catch (error) {
    throw handleServiceError(error, "Failed to compute analytics overview.");
  }
}

module.exports = {
  resolveStartupAccess,
  assertAnyRole,
  defaultCounts,
  getOverview,
  getProjectAnalytics,
  getTaskAnalytics,
  getHiringAnalytics,
  getFundingAnalytics,
  getMarketplaceAnalytics,
};
