// Bridges the backend Startup model (Main/server/src/models/Startup.js,
// validators/startup.validators.js) and this frontend's existing
// component field names (StartupCard/StartupsPage/etc were built against
// mockData.js's richer, partly-fictional shape). Two rules:
//   1. Never invent a value for a field the backend doesn't have
//      (techStack, teamSize, valuation, gallery, milestones-on-startup,
//      banner, healthScore) — always null/[]/undefined so components can
//      guard-render instead of displaying fabricated data.
//   2. Field names the frontend already reads (industry, logo,
//      fundingTarget) are kept as aliases onto the real backend field
//      (category, logoUrl, fundingGoal) so existing JSX needs minimal
//      changes.

export const STAGE_OPTIONS = [
  { value: 'idea', label: 'Idea' },
  { value: 'validation', label: 'Validation' },
  { value: 'early-stage', label: 'Early Stage' },
  { value: 'growth', label: 'Growth' },
  { value: 'established', label: 'Established' },
];

export function stageLabel(stageValue) {
  return STAGE_OPTIONS.find((s) => s.value === stageValue)?.label || stageValue || 'Unknown';
}

export function normalizeStartup(raw) {
  if (!raw) return null;
  return {
    id: raw._id || raw.id,
    name: raw.name,
    slug: raw.slug,
    tagline: raw.tagline || '',
    description: raw.description || '',
    logo: raw.logoUrl || null,
    banner: raw.logoUrl || null, // backend has no distinct banner field
    industry: raw.category || '',
    stage: raw.stage,
    stageLabel: stageLabel(raw.stage),
    location: raw.location || '',
    website: raw.websiteUrl || '',
    pitchDeckUrl: raw.pitchDeckUrl || '',
    problemStatement: raw.problemStatement || '',
    solution: raw.solution || '',
    targetMarket: raw.targetMarket || '',
    fundingRaised: raw.fundingRaised || 0,
    fundingTarget: raw.fundingGoal || 0,
    currency: raw.currency || 'USD',
    status: raw.status,
    isPublic: raw.isPublic,
    isFeatured: raw.isFeatured,
    tags: raw.tags || [],
    createdAt: raw.createdAt,
    // founder is a bare ObjectId string on this backend (never populated —
    // GET /users/:id is an unimplemented stub), never a User object.
    founderId: typeof raw.founder === 'string' ? raw.founder : raw.founder?._id,
    // No backend equivalent for any of these — always empty, never fabricated:
    techStack: [],
    milestones: [],
    gallery: [],
    teamSize: undefined,
    valuation: undefined,
    foundedYear: raw.createdAt ? new Date(raw.createdAt).getFullYear() : undefined,
    isBookmarked: false, // Startups have no bookmark endpoint on this backend
  };
}

export function normalizeStartups(list) {
  return Array.isArray(list) ? list.map(normalizeStartup) : [];
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `startup-${Date.now()}`;
}

// Builds exactly the payload startupCreate (Joi) accepts — strips every
// wizard-only field (team, milestones-as-drafted, story/mission/vision,
// businessModel, useOfFunds, banner, gallery, visibility) that has no
// backend column, rather than sending them and hoping .unknown(true)
// silently absorbs them.
export function toCreatePayload(form) {
  return {
    name: form.name,
    slug: slugify(form.name),
    tagline: form.tagline || '',
    description: form.description || '',
    category: form.industry || form.category || '',
    stage: form.stage,
    location: form.location || '',
    websiteUrl: form.website || '',
    logoUrl: form.logo || '',
    problemStatement: form.problem || '',
    solution: form.solution || '',
    targetMarket: form.targetAudience || '',
    fundingGoal: Number(form.fundingTarget) || 0,
    fundingRaised: Number(form.fundingRaised) || 0,
  };
}
