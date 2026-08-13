// Calls the real backend Milestone module (src/routes/milestone.routes.js).
import { apiClient } from './apiClient';

export async function listMilestones(projectId) {
  const query = {};
  if (projectId) query.projectId = projectId;
  return apiClient.get('/milestones', query);
}

export async function getMilestone(id) {
  return apiClient.get(`/milestones/${id}`);
}

export async function createMilestone(payload) {
  return apiClient.post('/milestones', payload);
}

export async function updateMilestone(id, payload) {
  return apiClient.put(`/milestones/${id}`, payload);
}

export async function archiveMilestone(id) {
  return apiClient.delete(`/milestones/${id}`);
}
