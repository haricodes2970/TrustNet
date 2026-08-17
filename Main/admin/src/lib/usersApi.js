import { apiClient } from './apiClient';

export async function listUsers(query) {
  return apiClient.getEnvelope('/admin/users', query);
}

export async function getUser(id) {
  return apiClient.get(`/admin/users/${id}`);
}

export async function suspendUser(id, reason) {
  return apiClient.post(`/admin/users/${id}/suspend`, { reason });
}

export async function reactivateUser(id) {
  return apiClient.post(`/admin/users/${id}/reactivate`);
}

export async function changeUserRole(id, role) {
  return apiClient.patch(`/admin/users/${id}/role`, { role });
}

export async function deleteUser(id) {
  return apiClient.delete(`/admin/users/${id}`);
}
