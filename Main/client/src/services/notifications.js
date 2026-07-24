import api from "./api";

// Notifications module — uses the shared axios instance (Bearer token + refresh flow).
// Endpoints (per backend, auth-guarded):
//   GET    /v1/notifications
//   GET    /v1/notifications/unread-count
//   PUT    /v1/notifications/:id/read
//   PUT    /v1/notifications/read-all
//   DELETE /v1/notifications/:id

export async function getNotifications(params = {}) {
  const { data } = await api.get("/notifications", { params });
  return data?.data ?? data;
}

export async function getUnreadCount() {
  const { data } = await api.get("/notifications/unread-count");
  return data?.data ?? data;
}

export async function markNotificationRead(id) {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data?.data ?? data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.put("/notifications/read-all");
  return data?.data ?? data;
}

export async function deleteNotification(id) {
  const { data } = await api.delete(`/notifications/${id}`);
  return data?.data ?? data;
}
