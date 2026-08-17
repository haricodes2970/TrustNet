import { apiClient } from './apiClient';

export async function listStartups(query) {
  return apiClient.get('/admin/startups', query);
}

export async function getStartup(id) {
  return apiClient.get(`/startups/${id}`);
}

export async function suspendStartup(id, reason) {
  return apiClient.post(`/admin/startups/${id}/suspend`, { reason });
}

export async function restoreStartup(id) {
  return apiClient.post(`/admin/startups/${id}/restore`);
}
