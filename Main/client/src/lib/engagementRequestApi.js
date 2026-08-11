// Calls the real backend EngagementRequest module (src/routes/engagementRequest.routes.js).
import { apiClient } from './apiClient';

export async function listRequests(params = {}) {
  return apiClient.get('/engagement-requests', params);
}

export async function createRequest(body) {
  return apiClient.post('/engagement-requests', body);
}

export async function getRequest(id) {
  return apiClient.get(`/engagement-requests/${id}`);
}

export async function updateStatus(id, status) {
  return apiClient.put(`/engagement-requests/${id}/status`, { status });
}

export async function cancelRequest(id) {
  return apiClient.put(`/engagement-requests/${id}/cancel`);
}
