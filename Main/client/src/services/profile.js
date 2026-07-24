import api from "./api";

// Profile module — uses the shared axios instance (Bearer token + refresh flow).
// Endpoints mirror the backend profile router:
//   GET    /v1/profile        -> getProfile
//   PUT    /v1/profile        -> updateProfile
//   POST   /v1/profile/avatar -> uploadAvatar (multipart, field "avatar")
//   DELETE /v1/profile/avatar -> removeAvatar

export async function getProfile() {
  const { data } = await api.get("/profile");
  return data?.data ?? data;
}

export async function updateProfile(payload) {
  const { data } = await api.put("/profile", payload);
  return data?.data ?? data;
}

export async function uploadAvatar(file) {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await api.post("/profile/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.data ?? data;
}

export async function removeAvatar() {
  const { data } = await api.delete("/profile/avatar");
  return data?.data ?? data;
}
