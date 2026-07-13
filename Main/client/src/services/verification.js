import api from "./api";

// Verification module — uses the shared axios instance (Bearer token + refresh flow).
// Endpoint (per backend, auth-guarded):
//   POST /v1/auth/resend-verification -> resendVerification

export async function resendVerification() {
  const { data } = await api.post("/v1/auth/resend-verification");
  return data;
}
