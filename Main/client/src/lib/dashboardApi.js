import { apiClient } from './apiClient';

// Calls the real backend Dashboard module (src/routes/dashboard.routes.js).
// Both named exports are kept so callers across the integration can use a
// stable surface: `getDashboard` (HEAD) and `getDashboardData` (upstream).
export const getDashboard = () => apiClient.get('/dashboard');

export async function getDashboardData() {
  return apiClient.get('/dashboard');
}
