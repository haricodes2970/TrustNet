/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../lib/authApi';
import { getToken, setToken } from '../lib/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState('initializing'); // 'initializing' | 'authenticated' | 'unauthenticated' | 'unauthorized' | 'error'
  const [authError, setAuthError] = useState(null);

  // On mount, restore session if access token exists
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
        if (user.role === 'admin') {
          setAuthState('authenticated');
        } else {
          setAuthState('unauthorized');
        }
      } catch (err) {
        setToken(null);
        if (err.status === 401) {
          setAuthState('unauthenticated');
        } else {
          setAuthState('error');
          setAuthError(err.message || 'Failed to authenticate');
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const result = await authApi.login({ email, password });
      if (result.requiresTwoFactor) {
        return result; // Caller must prompt for 2FA code
      }
      
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setAuthError(null);

      if (result.user.role === 'admin') {
        setAuthState('authenticated');
      } else {
        setAuthState('unauthorized');
      }
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
      setAuthError(null);

      if (result.user.role === 'admin') {
        setAuthState('authenticated');
      } else {
        setAuthState('unauthorized');
      }
      return result;
    } catch (err) {
      setAuthState('error');
      setAuthError(err.message || '2FA login failed');
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        authState,
        authError,
        login,
        completeTwoFactorLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
