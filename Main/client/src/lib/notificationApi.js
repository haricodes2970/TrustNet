// Calls the real backend Notification module (src/routes/notification.routes.js).
import { apiClient } from './apiClient';

export async function listNotifications(filter = {}) {
  return apiClient.get('/notifications', filter);
}

export async function getUnreadCount() {
  return apiClient.get('/notifications/unread-count');
}

export async function markRead(id) {
  return apiClient.put(`/notifications/${id}/read`);
}

export async function markAllRead() {
  return apiClient.put('/notifications/read-all');
}

export async function deleteNotification(id) {
  return apiClient.delete(`/notifications/${id}`);
}