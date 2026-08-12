import { apiClient } from './apiClient';

export const listInvestorProfiles = (options = {}) => apiClient.get('/investors', options);
