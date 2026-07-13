import axios from "axios";

// Shared axios instance for the MERN backend (Express on :5000, proxied via /api).
export const api = axios.create({
  baseURL: "/api",
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
  baseURL: "/api",
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
    const isAuthEndpoint = original?.url?.includes("/v1/auth/login")
      || original?.url?.includes("/v1/auth/register")
      || original?.url?.includes("/v1/auth/refresh");
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => addSubscriber(() => resolve(api(original))));
      }
      isRefreshing = true;
      try {
        const { data } = await refreshClient.post("/v1/auth/refresh");
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