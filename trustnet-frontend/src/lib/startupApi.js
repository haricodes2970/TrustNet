// Calls the real backend Startup module (src/routes/startup.routes.js).
import { apiClient } from './apiClient';

export async function listStartups(filter = {}, options = {}) {
  return apiClient.get('/startups', { filter, options });
}

export async function getStartup(id) {
  return apiClient.get(`/startups/${id}`);
}

export async function getMyStartups() {
  return apiClient.get('/startups/me');
}

export async function createStartup(payload) {
  return apiClient.post('/startups', payload);
}

export async function updateStartup(id, payload) {
  return apiClient.put(`/startups/${id}`, payload);
}
