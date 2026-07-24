import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import api, { API_BASE_URL } from "../services/api";

// Restore client: attaches the stored access token but has NO response
// interceptor. A failed session-restore (stale/invalid token) must NOT trigger
// the global hard-redirect to /login — it should just leave the user logged out.
const restoreApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
restoreApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef(0);

  const applyToken = (token) => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  };

  const fetchMe = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.data);
    return data.data;
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.post("/auth/refresh");
    const token = data?.data?.accessToken;
    if (token) {
      applyToken(token);
      return token;
    }
    throw new Error("Refresh returned no access token");
  }, []);

  // Restore the session on first load / page refresh. Uses restoreApi (no
  // redirect-on-401 interceptor) so a stale/invalid token just logs the user
  // out instead of hard-navigating the whole app to /login.
  useEffect(() => {
    const mySession = sessionRef.current;
    let active = true;
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await restoreApi.get("/auth/me");
        setUser(data.data);
      } catch (e) {
        try {
          const { data } = await restoreApi.post("/auth/refresh");
          const newToken = data?.data?.accessToken;
          if (newToken) applyToken(newToken);
          const { data: meData } = await restoreApi.get("/auth/me");
          setUser(meData.data);
        } catch (e2) {
          if (!active || sessionRef.current !== mySession) return;
          applyToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    sessionRef.current += 1;
    const response = await api.post("/auth/login", { email, password });
    if (response.data?.data?.requiresTwoFactor) {
      return response.data;
    }
    applyToken(response.data.data.accessToken);
    setUser(response.data.data.user);
    return response.data;
  };

  const completeTwoFactorLogin = async (twoFactorToken, token) => {
    const response = await api.post("/auth/login/2fa", { twoFactorToken, token });
    applyToken(response.data.data.accessToken);
    setUser(response.data.data.user);
    return response.data;
  };

  // Used by the OAuth callback page: the backend already issued an access
  // token (it arrives via the ?token= query param after Google/LinkedIn
  // redirect back), so we just store it and fetch the profile — no
  // email/password round trip needed.
  const loginWithToken = useCallback(async (token) => {
    sessionRef.current += 1;
    applyToken(token);
    const me = await fetchMe();
    return me;
  }, [fetchMe]);

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  const logout = async () => {
    sessionRef.current += 1;
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore — clear local session regardless
    }
    applyToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, completeTwoFactorLogin, loginWithToken, register, logout, refresh, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
