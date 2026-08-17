import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../lib/authApi';
import { getToken, setToken } from '../lib/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState('initializing'); // 'initializing' | 'authenticated' | 'unauthenticated' | 'expired' | 'error'
  const [authError, setAuthError] = useState(null);

  // Derived verification state from GET /auth/me response
  const isEmailVerified = currentUser?.emailVerified || false;
  const verificationStatus = currentUser?.verificationStatus || 'draft';
  const isVerified = currentUser?.isVerified || false;
  const accountStatus = currentUser?.accountStatus || 'EMAIL_PENDING';

  // On mount, restore the session from a stored access token by asking the
  // backend who it belongs to (GET /auth/me). No token stored -> logged out.
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setAuthState('unauthenticated');
        setIsLoading(false);
        return;
      }
      try {
        const user = await authApi.fetchCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
        setAuthState('authenticated');
      } catch (err) {
        setToken(null);
        if (err.status === 401) {
          setAuthState('expired');
        } else {
          setAuthState('error');
          setAuthError(err.message || 'Failed to authenticate');
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Real login against POST /auth/login. `role` is a local display/routing
  // hint only (which dashboard variant to land on) -- this backend's User
  // model doesn't accept a role choice at login time, so it's never sent.
  const login = async (email, password) => {
    try {
      const result = await authApi.login({ email, password });
      if (result.requiresTwoFactor) {
        return result; // caller must complete /login/2fa before we're authenticated
      }
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setAuthState('authenticated');
      setAuthError(null);
      return result;
    } catch (err) {
      setAuthState('error');
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const completeTwoFactorLogin = async (twoFactorToken, token) => {
    try {
      const result = await authApi.loginWithTwoFactor({ twoFactorToken, token });
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setAuthState('authenticated');
      setAuthError(null);
      return result;
    } catch (err) {
      setAuthState('error');
      setAuthError(err.message || '2FA authentication failed');
      throw err;
    }
  };

  const loginWithToken = async (token) => {
    setToken(token);
    try {
      const user = await authApi.fetchCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
      setAuthState('authenticated');
      setAuthError(null);
      return user;
    } catch (err) {
      setToken(null);
      setAuthState('error');
      setAuthError(err.message || 'OAuth authentication failed');
      throw err;
    }
  };

  const register = async (fields) => authApi.register(fields);

  const refreshUser = async () => {
    try {
      const user = await authApi.fetchCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
      setAuthState('authenticated');
      return user;
    } catch (err) {
      setToken(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthState('unauthenticated');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthState('unauthenticated');
      setAuthError(null);
    }
  };

  const updateUserProfile = (updatedFields) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedFields }));
  };

  const refreshCurrentUser = async () => {
    const user = await authApi.fetchCurrentUser();
    setCurrentUser(user);
    setIsAuthenticated(true);
    setAuthState('authenticated');
    return user;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        authState,
        authError,
        isEmailVerified,
        verificationStatus,
        isVerified,
        accountStatus,
        login,
        completeTwoFactorLogin,
        loginWithToken,
        register,
        refreshUser,
        logout,
        updateUserProfile,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
