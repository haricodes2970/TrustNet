// Calls the real backend Document module (src/routes/document.routes.js).
import { BASE_URL, getToken, apiClient } from './apiClient';

export async function listDocuments(projectId) {
  const query = {};
  if (projectId) query.projectId = projectId;
  return apiClient.get('/documents', query);
}

export async function getDocument(id) {
  return apiClient.get(`/documents/${id}`);
}

export async function uploadDocument(formData) {
  const url = `${BASE_URL}/documents`;
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData, // Let the browser set the boundary header
  });

  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Failed to upload document.');
  }
  return payload.data;
}

export async function updateDocumentMetadata(id, payload) {
  return apiClient.put(`/documents/${id}`, payload);
}

export async function archiveDocument(id) {
  return apiClient.delete(`/documents/${id}`);
}
