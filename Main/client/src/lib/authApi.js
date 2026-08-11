// Calls the real backend Auth module (src/routes/auth.routes.js). Only
// wraps endpoints that actually exist and do something — this backend's
// /auth/verify-email and /auth/resend-verification are now fully active.
import { apiClient, setToken } from './apiClient';

export async function register({ email, password, fullName, username }) {
  return apiClient.post('/auth/register', { email, password, fullName, username });
}

export async function login({ email, password }) {
  const data = await apiClient.post('/auth/login', { email, password });
  if (data.requiresTwoFactor) {
    return data; // { requiresTwoFactor: true, twoFactorToken }
  }
  setToken(data.accessToken);
  return data; // { accessToken, user }
}

export async function loginWithTwoFactor({ twoFactorToken, token }) {
  const data = await apiClient.post('/auth/login/2fa', { twoFactorToken, token });
  setToken(data.accessToken);
  return data;
}

export async function fetchCurrentUser() {
  return apiClient.get('/auth/me');
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setToken(null);
  }
}

export async function forgotPassword({ email }) {
  return apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword({ token, password, confirmPassword }) {
  return apiClient.post('/auth/reset-password', { token, password, confirmPassword });
}

export async function verifyEmail({ email, otp }) {
  return apiClient.post('/auth/verify-email', { email, otp });
}

export async function resendVerification({ email }) {
  return apiClient.post('/auth/resend-verification', { email });
}

