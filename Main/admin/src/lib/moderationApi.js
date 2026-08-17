import { apiClient } from './apiClient';

export async function listPosts(query) {
  return apiClient.get('/posts', query);
}

export async function listCommunities(query) {
  return apiClient.get('/communities', query);
}

export async function listJobs(query) {
  return apiClient.get('/jobs', query);
}

export async function moderateContent(type, id, action, reason) {
  return apiClient.post(`/admin/content/${type}/${id}/moderate`, { action, reason });
}
