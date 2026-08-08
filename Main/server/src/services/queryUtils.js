// Phase 17 (final audit): this file was a byte-for-byte duplicate of
// serviceUtils.js's normalizeFilter/applyQueryOptions - accidental
// duplication from the original backend merge, not a deliberate split.
// Two copies meant the unbounded-query fix would have had to be applied
// twice and could drift apart afterwards, so it now re-exports the single
// implementation instead. Kept as a module (rather than updating ~9
// importers) so the change stays low-risk in the final audit phase.
const { normalizeFilter, applyQueryOptions } = require("./serviceUtils");

module.exports = {
  normalizeFilter,
  applyQueryOptions,
};
