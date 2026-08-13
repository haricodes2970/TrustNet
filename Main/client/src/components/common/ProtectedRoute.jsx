import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SkeletonPage } from '../ui/SkeletonLoaders';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, isAuthenticated, isLoading, authState } = useAuth();
  const location = useLocation();

  // Still resolving the stored token via GET /auth/me on initial load --
  // don't redirect to /login yet, that would bounce an already-logged-in
  // user on every page refresh.
  if (isLoading || authState === 'initializing') {
    return <SkeletonPage />;
  }

  // 1. Check if authenticated
  if (!isAuthenticated || authState === 'unauthenticated' || authState === 'expired') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check if email/OTP verified
  if (!currentUser?.emailVerified) {
    if (location.pathname !== '/verify-otp') {
      return <Navigate to="/verify-otp" state={{ email: currentUser?.email }} replace />;
    }
    return children;
  }

  // 3. Check if onboarding is completed
  if (!currentUser?.onboardingCompleted) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    return children;
  }

  // 4. Check if identity verification is complete
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrator';
  const isKycVerified = currentUser?.isVerified || false;

  // Identity verification is required for all non-admins
  const requiresVerification = !isKycVerified && !isAdmin;

  if (requiresVerification) {
    if (location.pathname !== '/verification') {
      return <Navigate to="/verification" replace />;
    }
    return children;
  }

  // 5. If they are already fully verified, they shouldn't access onboarding
  if (location.pathname === '/onboarding') {
    return <Navigate to="/app/dashboard" replace />;
  }

  // 6. Check role permissions if applicable
  if (allowedRoles.length > 0) {
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
    const hasPermission = normalizedAllowedRoles.includes(userRole) ||
      (userRole === 'administrator' && normalizedAllowedRoles.includes('admin')) ||
      (userRole === 'admin' && normalizedAllowedRoles.includes('administrator'));

    if (!hasPermission) {
      return <Navigate to="/app/403" replace />;
    }
  }

  return children;
};
