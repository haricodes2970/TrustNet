import api from "./api";

// Verification module — uses the shared axios instance (Bearer token + refresh flow).
// Endpoint (per backend, auth-guarded):
//   POST /v1/auth/resend-verification -> resendVerification

export async function resendVerification() {
  const { data } = await api.post("/auth/resend-verification");
  return data;
}

export async function getVerification() {
  const { data } = await api.get("/verification");
  return data?.data ?? data;
}

export async function uploadVerificationDocument(type, file) {
  const form = new FormData();
  form.append("document", file);
  const { data } = await api.post(`/verification/documents/${type}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.data ?? data;
}

export async function submitVerification() {
  const { data } = await api.post("/verification/submit");
  return data?.data ?? data;
}
