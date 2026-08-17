import { apiClient } from './apiClient';

export async function listVerificationRequests() {
  return apiClient.get('/admin/verifications');
}

export async function getVerificationRequest(id) {
  return apiClient.get(`/admin/verifications/${id}`);
}

export async function approveVerification(id) {
  return apiClient.post(`/admin/verifications/${id}/approve`);
}

export async function rejectVerification(id, reason) {
  return apiClient.post(`/admin/verifications/${id}/reject`, { reason });
}

export async function requestResubmission(id, reason) {
  return apiClient.post(`/admin/verifications/${id}/request-resubmission`, { reason });
}
