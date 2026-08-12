import { apiClient } from './apiClient';

export const getVerification = () => apiClient.get('/verification');

export const uploadVerificationDocument = (type, file) => {
  const formData = new FormData();
  formData.append('document', file);
  return apiClient.post(`/verification/documents/${type}`, formData);
};

export const submitVerification = () => apiClient.post('/verification/submit');
