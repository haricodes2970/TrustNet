import { apiClient } from './apiClient';

export const getAnalyticsOverview = (startupId) => apiClient.get('/analytics/overview', { startupId });
