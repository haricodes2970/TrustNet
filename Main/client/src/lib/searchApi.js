// Calls the real backend Search module (src/routes/search.routes.js).
import { apiClient } from './apiClient';

export async function search(query, type, limit, skip) {
  return apiClient.get('/search', { q: query, type, limit, skip });
}
