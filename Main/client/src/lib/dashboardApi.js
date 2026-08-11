import { apiClient } from './apiClient';

export async function getDashboardData() {
  return apiClient.get('/dashboard');
}
