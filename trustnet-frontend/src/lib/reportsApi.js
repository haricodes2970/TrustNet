// Calls the real backend Reports module (report.routes.js). Owner/Admin
// only -- backend returns 403 for a contributor or unrelated user, which
// the caller surfaces as a thrown Error via apiClient.
import { apiClient } from './apiClient';

const REPORT_TYPES = ['startup', 'projects', 'tasks', 'hiring', 'funding', 'marketplace'];

export async function generateReport(reportType, startupId, format = 'json') {
  return apiClient.get(`/reports/${reportType}`, { startupId, format });
}

export { REPORT_TYPES };
