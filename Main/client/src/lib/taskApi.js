// Calls the real backend Task module (src/routes/task.routes.js).
import { apiClient } from './apiClient';

export async function listTasks(projectId, assignedTo) {
  const query = {};
  if (projectId) query.projectId = projectId;
  if (assignedTo) query.assignedTo = assignedTo;
  return apiClient.get('/tasks', query);
}

export async function getTask(id) {
  return apiClient.get(`/tasks/${id}`);
}

export async function createTask(payload) {
  return apiClient.post('/tasks', payload);
}

export async function updateTask(id, payload) {
  return apiClient.put(`/tasks/${id}`, payload);
}

export async function archiveTask(id) {
  return apiClient.delete(`/tasks/${id}`);
}
