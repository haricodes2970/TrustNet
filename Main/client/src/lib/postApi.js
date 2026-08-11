// Calls the real backend Post module (src/routes/post.routes.js).
import { apiClient } from './apiClient';

export async function listPosts(filter = {}, options = {}) {
  return apiClient.get('/posts', { filter, options });
}

export async function createPost(body) {
  return apiClient.post('/posts', body);
}
