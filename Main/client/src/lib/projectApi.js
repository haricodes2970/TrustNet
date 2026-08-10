// Calls the real backend Project module (src/routes/project.routes.js).
import { apiClient } from './apiClient';

export async function listProjects(workspaceId) {
  // If workspaceId is provided, filter projects by workspaceId
  const query = workspaceId ? { workspaceId } : {};
  return apiClient.get('/projects', query);
}

export async function getProject(id) {
  return apiClient.get(`/projects/${id}`);
}

export async function createProject(payload) {
  return apiClient.post('/projects', payload);
}

export async function updateProject(id, payload) {
  return apiClient.put(`/projects/${id}`, payload);
}

export async function archiveProject(id) {
  return apiClient.delete(`/projects/${id}`);
}
