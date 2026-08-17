import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SkeletonPage } from '../ui/SkeletonLoaders';

export const ProtectedRoute = ({ children, allowedRoles = [], requireVerifiedEmail = false, requireApprovedVerification = false }) => {
  const { currentUser, isAuthenticated, isLoading, authState } = useAuth();
  const location = useLocation();

  // Still resolving the stored token via GET /auth/me on initial load --
  // don't redirect to /login yet, that would bounce an already-logged-in
  // user on every page refresh.
  if (isLoading || authState === 'initializing') {
    return <SkeletonPage />;
  }

  if (!isAuthenticated || authState === 'unauthenticated' || authState === 'expired') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Normalize role matching (e.g. 'admin' or 'Administrator')
  const userRole = (currentUser?.role || '').toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

  const hasPermission = normalizedAllowedRoles.length === 0 ||
    normalizedAllowedRoles.includes(userRole) ||
    (userRole === 'administrator' && normalizedAllowedRoles.includes('admin')) ||
    (userRole === 'admin' && normalizedAllowedRoles.includes('administrator'));

  if (!hasPermission) {
    return <Navigate to="/app/403" replace />;
  }

  // `verificationStatus` from GET /auth/me is the KYC source of truth.
  // Admins are deliberately exempt: their backend-authorized admin routes
  // must remain available even if their own normal-user KYC state differs.
  const isAdmin = userRole === 'admin' || userRole === 'administrator';
  if (requireVerifiedEmail && !isAdmin && !currentUser?.emailVerified) {
    return <Navigate to="/verify-otp" state={{ email: currentUser?.email, from: location }} replace />;
  }
  if (requireApprovedVerification && !isAdmin && currentUser?.verificationStatus !== 'approved') {
    return <Navigate to="/verification" state={{ from: location }} replace />;
  }

  return children;
};
