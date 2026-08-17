// Calls the real backend Workspace module (src/routes/workspace.routes.js).
import { apiClient } from './apiClient';

export async function listWorkspaces(filter = {}, options = {}) {
  return apiClient.get('/workspaces', { filter, options });
}

export async function getWorkspace(id) {
  return apiClient.get(`/workspaces/${id}`);
}

export async function createWorkspace(payload) {
  return apiClient.post('/workspaces', payload);
}

export async function updateWorkspace(id, payload) {
  return apiClient.put(`/workspaces/${id}`, payload);
}

export async function archiveWorkspace(id) {
  return apiClient.delete(`/workspaces/${id}`);
}

export async function listWorkspaceMembers(id) {
  return apiClient.get(`/workspaces/${id}/members`);
}
