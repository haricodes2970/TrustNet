// Calls the real backend Team module (src/routes/team.routes.js).
import { apiClient } from './apiClient';

export async function listTeams(filter = {}, options = {}) {
  return apiClient.get('/teams', { filter, options });
}

export async function getTeam(id) {
  return apiClient.get(`/teams/${id}`);
}

export async function createTeam(payload) {
  return apiClient.post('/teams', payload);
}

export async function updateTeam(id, payload) {
  return apiClient.put(`/teams/${id}`, payload);
}

export async function archiveTeam(id) {
  return apiClient.delete(`/teams/${id}`);
}

export async function inviteMember(id, payload) {
  return apiClient.post(`/teams/${id}/members`, payload);
}

export async function removeMember(id, memberId) {
  return apiClient.delete(`/teams/${id}/members/${memberId}`);
}

export async function changeMemberRole(id, memberId, role) {
  return apiClient.put(`/teams/${id}/members/${memberId}/role`, { role });
}
