// Calls the real backend Notification module (src/routes/notification.routes.js).
import { apiClient } from './apiClient';

export async function listNotifications() {
  return apiClient.get('/notifications');
}
