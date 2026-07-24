import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../lib/authApi';
import { getToken, setToken } from '../lib/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore the session from a stored access token by asking the
  // backend who it belongs to (GET /auth/me). No token stored -> logged out.
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const user = await authApi.fetchCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Real login against POST /auth/login. `role` is a local display/routing
  // hint only (which dashboard variant to land on) -- this backend's User
  // model doesn't accept a role choice at login time, so it's never sent.
  const login = async (email, password) => {
    const result = await authApi.login({ email, password });
    if (result.requiresTwoFactor) {
      return result; // caller must complete /login/2fa before we're authenticated
    }
    setCurrentUser(result.user);
    setIsAuthenticated(true);
    return result;
  };

  const completeTwoFactorLogin = async (twoFactorToken, token) => {
    const result = await authApi.loginWithTwoFactor({ twoFactorToken, token });
    setCurrentUser(result.user);
    setIsAuthenticated(true);
    return result;
  };

  const register = async (fields) => authApi.register(fields);

  const logout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const updateUserProfile = (updatedFields) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedFields }));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        login,
        completeTwoFactorLogin,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
