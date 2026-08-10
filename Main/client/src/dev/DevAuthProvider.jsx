import React, { useState } from 'react';
import { AuthContext } from '../context/AuthContext';

// Deliberately opt-in. Production always uses AuthProvider and real /auth/me.
const developmentUser = {
  _id: 'dev-user', fullName: 'Development User', name: 'Development User',
  role: 'entrepreneur', isVerified: true, verificationStatus: 'approved',
};

export const DevAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(developmentUser);
  return <AuthContext.Provider value={{
    currentUser, isAuthenticated: true, isLoading: false,
    login: async () => ({ user: currentUser }), register: async () => ({}),
    completeTwoFactorLogin: async () => ({ user: currentUser }), loginWithToken: async () => currentUser,
    logout: async () => {}, updateUserProfile: (fields) => setCurrentUser((user) => ({ ...user, ...fields })),
  }}>{children}</AuthContext.Provider>;
};
