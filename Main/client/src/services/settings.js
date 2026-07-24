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
  const { data } = await api.get("/settings");
  return data?.data ?? data;
}

export async function updateProfileSettings(payload) {
  const { data } = await api.put("/settings/profile", payload);
  return data?.data ?? data;
}

export async function updatePreferences(payload) {
  const { data } = await api.put("/settings/preferences", payload);
  return data?.data ?? data;
}

export async function updatePrivacy(payload) {
  const { data } = await api.put("/settings/privacy", payload);
  return data?.data ?? data;
}

export async function updateAppearance(payload) {
  const { data } = await api.put("/settings/appearance", payload);
  return data?.data ?? data;
}

export async function getSessions() {
  const { data } = await api.get("/settings/sessions");
  return data?.data ?? data;
}

export async function deleteSession(id) {
  const { data } = await api.delete(`/settings/sessions/${id}`);
  return data?.data ?? data;
}

export async function deleteAccount(currentPassword) {
  const { data } = await api.delete("/auth/account", { data: { currentPassword } });
  return data?.data ?? data;
}

export async function changePassword(payload) {
  const { data } = await api.put("/auth/change-password", payload);
  return data?.data ?? data;
}

export async function getTwoFactorStatus() {
  const { data } = await api.get("/auth/2fa");
  return data?.data ?? data;
}

export async function setupTwoFactor() {
  const { data } = await api.post("/auth/2fa/setup");
  return data?.data ?? data;
}

export async function enableTwoFactor(token) {
  const { data } = await api.post("/auth/2fa/enable", { token });
  return data?.data ?? data;
}

export async function disableTwoFactor(currentPassword, token) {
  const { data } = await api.post("/auth/2fa/disable", { currentPassword, token });
  return data?.data ?? data;
}
