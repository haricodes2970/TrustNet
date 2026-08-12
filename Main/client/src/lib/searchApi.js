import { apiClient } from './apiClient';

export const search = (query, type = 'users') => apiClient.get('/search', { q: query, type });
