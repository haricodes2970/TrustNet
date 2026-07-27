// Calls the real backend Admin module (src/routes/admin.routes.js). The
// backend only implements verification review -- there is no user-suspend,
// startup-moderation, content-moderation, broadcast, or audit-log endpoint,
// so this module intentionally does not expose those.
import { apiClient } from './apiClient';

export async function getAdminMe() {
  return apiClient.get('/admin/me');
}

export async function listVerifications(options = {}) {
  return apiClient.get('/admin/verifications', options);
}

export async function getVerification(userId) {
  return apiClient.get(`/admin/verifications/${userId}`);
}

export async function approveVerification(userId) {
  return apiClient.post(`/admin/verifications/${userId}/approve`);
}

export async function rejectVerification(userId, reason) {
  return apiClient.post(`/admin/verifications/${userId}/reject`, reason ? { reason } : undefined);
}
