import api from "./api";

// Messaging module — uses the shared axios instance (Bearer token + refresh flow).
// Endpoints (per backend, auth-guarded):
//   GET    /v1/messages/conversations
//   POST   /v1/messages/conversations
//   GET    /v1/messages/conversations/:id
//   DELETE /v1/messages/conversations/:id
//   GET    /v1/messages/conversations/:id/messages
//   POST   /v1/messages/conversations/:id/messages
//   PUT    /v1/messages/conversations/:id/messages/:messageId/read
//   DELETE /v1/messages/conversations/:id/messages/:messageId
//   GET    /v1/messages/unread-count

export async function getConversations(params = {}) {
  const { data } = await api.get("/v1/messages/conversations", { params });
  return data?.data ?? data;
}

export async function createConversation(payload) {
  const { data } = await api.post("/v1/messages/conversations", payload);
  return data?.data ?? data;
}

export async function getConversation(id) {
  const { data } = await api.get(`/v1/messages/conversations/${id}`);
  return data?.data ?? data;
}

export async function deleteConversation(id) {
  const { data } = await api.delete(`/v1/messages/conversations/${id}`);
  return data?.data ?? data;
}

export async function getMessages(conversationId, params = {}) {
  const { data } = await api.get(`/v1/messages/conversations/${conversationId}/messages`, {
    params,
  });
  return data?.data ?? data;
}

export async function sendMessage(conversationId, payload) {
  const { data } = await api.post(
    `/v1/messages/conversations/${conversationId}/messages`,
    payload
  );
  return data?.data ?? data;
}

export async function markMessageRead(conversationId, messageId) {
  const { data } = await api.put(
    `/v1/messages/conversations/${conversationId}/messages/${messageId}/read`
  );
  return data?.data ?? data;
}

export async function deleteMessage(conversationId, messageId) {
  const { data } = await api.delete(
    `/v1/messages/conversations/${conversationId}/messages/${messageId}`
  );
  return data?.data ?? data;
}

export async function getUnreadCount() {
  const { data } = await api.get("/v1/messages/unread-count");
  return data?.data ?? data;
}
