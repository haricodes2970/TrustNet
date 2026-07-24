import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SkeletonPage } from '../ui/SkeletonLoaders';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Still resolving the stored token via GET /auth/me on initial load --
  // don't redirect to /login yet, that would bounce an already-logged-in
  // user on every page refresh.
  if (isLoading) {
    return <SkeletonPage />;
  }

  if (!isAuthenticated && !currentUser) {
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

  return children;
};
