function normalizeFilter(filter) {
  if (!filter) {
    return {};
  }

  if (typeof filter === "string") {
    try {
      return JSON.parse(filter);
    } catch (error) {
      return {};
    }
  }

  return filter;
}

function applyQueryOptions(query, options = {}) {
  if (options.sort) {
    query.sort(options.sort);
  }

  if (options.limit) {
    query.limit(Number(options.limit));
  }

  if (options.skip) {
    query.skip(Number(options.skip));
  }

  return query;
}

module.exports = {
  normalizeFilter,
  applyQueryOptions,
};
