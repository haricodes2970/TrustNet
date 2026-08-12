// Calls the real backend Post module (src/routes/post.routes.js).
import { apiClient } from './apiClient';

export async function listPosts(filter = {}, options = {}) {
  const query = {};

  if (filter.community) query.community = filter.community;
  if (filter.author) query.author = filter.author;
  if (filter.search) query.search = filter.search;

  if (options.limit !== undefined) query.limit = options.limit;
  if (options.skip !== undefined) query.skip = options.skip;
  if (options.sort !== undefined) query.sort = options.sort;

  return apiClient.get('/posts', query);
}

export async function createPost(body) {
  return apiClient.post('/posts', body);
}
