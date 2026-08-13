import { apiClient } from './apiClient';

export async function listAuditLogs(query) {
  return apiClient.getEnvelope('/admin/activity-logs', query);
}
