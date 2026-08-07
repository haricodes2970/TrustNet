const User = require("../models/User");
const Startup = require("../models/Startup");
const Community = require("../models/Community");
const Post = require("../models/Post");
const ServiceListing = require("../models/ServiceListing");
const providerProfileService = require("./providerProfileService");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Regex-based substring search, not $text - this is a deliberate choice,
// not the "unused index" oversight BACKLOG.md flagged it as: Startup's
// `{name,tagline,description}` text index uses token/stemming matching,
// which would NOT match a partial/prefix term like "eag" against "eagle"
// the way a substring regex does. Regex is the better UX fit for a
// search-as-you-type box; the text index is simply not the right tool for
// this query shape (a $text query can't be built from the same term
// alongside a regex fallback without doing two queries per field). See
// BACKLOG.md for the explicit decision record.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(term) {
  return new RegExp(escapeRegex(term), "i");
}

function clampLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function clampSkip(skip) {
  const parsed = Number(skip);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

async function searchUsers(term, { limit, skip } = {}) {
  return User.find({
    isActive: true,
    deletedAt: null,
    $or: [
      { fullName: buildRegex(term) },
      { username: buildRegex(term) },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(clampSkip(skip))
    .limit(clampLimit(limit))
    .select("fullName username avatarUrl designation isVerified")
    .lean();
}

async function searchStartups(term, { limit, skip } = {}) {
  return Startup.find({
    status: "active",
    isPublic: true,
    isSuspended: false,
    deletedAt: null,
    $or: [
      { name: buildRegex(term) },
      { tagline: buildRegex(term) },
      { category: buildRegex(term) },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(clampSkip(skip))
    .limit(clampLimit(limit))
    .select("name slug tagline logoUrl category stage")
    .lean();
}

// Private/restricted communities are deliberately included here (not
// filtered by `type`) - same design decision made in the Communities
// hardening phase: a community's own existence stays discoverable for
// public/private/restricted alike (only its `visibility:"community"`
// posts are membership-gated), since no invite/request flow exists to
// find a private community any other way. See docs/modules/communities.md.
async function searchCommunities(term, { limit, skip } = {}) {
  return Community.find({
    isActive: true,
    isHidden: false,
    deletedAt: null,
    $or: [
      { name: buildRegex(term) },
      { description: buildRegex(term) },
      { category: buildRegex(term) },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(clampSkip(skip))
    .limit(clampLimit(limit))
    .select("name slug description category type memberCount coverImageUrl")
    .lean();
}

async function searchPosts(term, { limit, skip } = {}) {
  return Post.find({
    visibility: "public",
    isHidden: false,
    deletedAt: null,
    $or: [
      { title: buildRegex(term) },
      { content: buildRegex(term) },
      { tags: buildRegex(term) },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(clampSkip(skip))
    .limit(clampLimit(limit))
    .select("title content author postType likeCount commentCount createdAt")
    .lean();
}

// New this phase - Marketplace had no search surface in the global search
// endpoint at all, despite being a fully hardened module. Mirrors
// serviceListingService.listListingsForUser's public-subset rules exactly:
// published, not archived, not hidden, not deleted, and the provider's
// account must be active (reuses providerProfileService.listInactiveProviderIds
// - the canonical owner of that check, not duplicated here).
async function searchServiceListings(term, { limit, skip } = {}) {
  const inactiveProviderIds = await providerProfileService.listInactiveProviderIds();
  return ServiceListing.find({
    status: "published",
    isArchived: false,
    isHidden: false,
    deletedAt: null,
    provider: { $nin: inactiveProviderIds },
    $or: [
      { title: buildRegex(term) },
      { description: buildRegex(term) },
      { category: buildRegex(term) },
      { tags: buildRegex(term) },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(clampSkip(skip))
    .limit(clampLimit(limit))
    .select("title category pricingModel priceMin priceMax currency provider tags createdAt")
    .lean();
}

const SEARCHERS = {
  users: searchUsers,
  startups: searchStartups,
  communities: searchCommunities,
  posts: searchPosts,
  listings: searchServiceListings,
};

// `type` (optional) scopes the search to a single category - e.g.
// ?q=acme&type=startups - instead of always fanning out to every
// collection. No filter runs every category, same as before this phase.
async function globalSearch(query, { type, limit, skip } = {}) {
  const term = (query || "").trim().slice(0, 200);

  if (!term) {
    return { users: [], startups: [], communities: [], posts: [], listings: [] };
  }

  const pageOptions = { limit, skip };

  if (type && SEARCHERS[type]) {
    const results = await SEARCHERS[type](term, pageOptions);
    return { users: [], startups: [], communities: [], posts: [], listings: [], [type]: results };
  }

  const [users, startups, communities, posts, listings] = await Promise.all([
    searchUsers(term, pageOptions),
    searchStartups(term, pageOptions),
    searchCommunities(term, pageOptions),
    searchPosts(term, pageOptions),
    searchServiceListings(term, pageOptions),
  ]);

  return { users, startups, communities, posts, listings };
}

module.exports = {
  globalSearch,
  searchUsers,
  searchStartups,
  searchCommunities,
  searchPosts,
  searchServiceListings,
};
