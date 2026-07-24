import axios from "axios";

// Shared axios instance for the MERN backend. Base URL comes from
// VITE_API_URL (set per-environment -- see .env.example and
// docs/DEPLOYMENT.md); falls back to the local backend for dev when unset.
// No Vercel rewrite/proxy involved -- this always points at a full,
// absolute backend origin.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach the access token (stored by useAuth) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Separate instance for the refresh call so its 401s don't trigger this
// interceptor recursively.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let subscribers = [];

function onRefreshed(token) {
  subscribers.forEach((cb) => cb(token));
  subscribers = [];
}
function addSubscriber(cb) {
  subscribers.push(cb);
}

// Refresh-token flow: on 401, exchange the httpOnly refresh cookie for a new
// access token, then retry the original request once.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Auth endpoints (login/register/refresh) should surface their own 401s
    // (e.g. "invalid credentials") instead of triggering the refresh-and-
    // hard-redirect flow, which caused every failed login to reload the page.
    const isAuthEndpoint = original?.url?.includes("/auth/login")
      || original?.url?.includes("/auth/register")
      || original?.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => addSubscriber(() => resolve(api(original))));
      }
      isRefreshing = true;
      try {
        const { data } = await refreshClient.post("/auth/refresh");
        const token = data?.data?.accessToken;
        if (!token) throw new Error("No access token returned");
        localStorage.setItem("token", token);
        onRefreshed(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        localStorage.removeItem("token");
        subscribers = [];
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;