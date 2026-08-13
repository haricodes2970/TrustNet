import { apiClient, setToken } from './apiClient';

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
  return data; // { accessToken, user }
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
