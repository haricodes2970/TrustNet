import api from "./api";

// Settings module — uses the shared axios instance (Bearer token + refresh flow).
// Endpoints (per backend, auth-guarded):
//   GET    /v1/settings
//   PUT    /v1/settings/profile
//   PUT    /v1/settings/preferences
//   PUT    /v1/settings/privacy
//   PUT    /v1/settings/appearance
//   GET    /v1/settings/sessions
//   DELETE /v1/settings/sessions/:id

export async function getSettings() {
  const { data } = await api.get("/v1/settings");
  return data?.data ?? data;
}

export async function updateProfileSettings(payload) {
  const { data } = await api.put("/v1/settings/profile", payload);
  return data?.data ?? data;
}

export async function updatePreferences(payload) {
  const { data } = await api.put("/v1/settings/preferences", payload);
  return data?.data ?? data;
}

export async function updatePrivacy(payload) {
  const { data } = await api.put("/v1/settings/privacy", payload);
  return data?.data ?? data;
}

export async function updateAppearance(payload) {
  const { data } = await api.put("/v1/settings/appearance", payload);
  return data?.data ?? data;
}

export async function getSessions() {
  const { data } = await api.get("/v1/settings/sessions");
  return data?.data ?? data;
}

export async function deleteSession(id) {
  const { data } = await api.delete(`/v1/settings/sessions/${id}`);
  return data?.data ?? data;
}
