// Thin fetch wrapper around the TrustNet backend's /api/v1 surface. The
// backend is the source of truth for shape: every endpoint returns
// { success: true, data } or { success: false, message }, so this client's
// only job is base-URL/token plumbing and turning the failure envelope
// into a thrown Error the caller can catch.

// VITE_API_URL matches the env var name established for Main/client and
// documented for Vercel (VITE_API_URL=https://trustnet-8lr8.onrender.com/api/v1)
// -- kept identical across both frontends so one Vercel env var works
// regardless of which one is deployed.
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'trustnet_access_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }
  }

  const isFormData = body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    credentials: 'include', // send the refresh cookie alongside the bearer token
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // A non-JSON response (e.g. a proxy error page) still needs a message.
  }

  if (!response.ok || !payload || payload.success === false) {
    const message = payload?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.errors = payload?.errors;
    throw error;
  }

  return payload.data;
}

export const apiClient = {
  get: (path, query) => request(path, { method: 'GET', query }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
