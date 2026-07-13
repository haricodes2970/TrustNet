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

function handleServiceError(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error;
  }

  return new Error(fallbackMessage);
}

module.exports = {
  normalizeFilter,
  applyQueryOptions,
  handleServiceError,
};
