import { apiClient } from './apiClient';

export async function fetchDashboardOverview() {
  return apiClient.get('/admin/dashboard/overview');
}
