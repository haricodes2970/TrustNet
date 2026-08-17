import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import './ProtectedRoute.css';

export default function ProtectedRoute() {
  const { authState, isLoading, logout, currentUser } = useAuth();

  // Allow direct Admin access in local development preview mode
  if (import.meta.env.DEV) {
    return <Outlet />;
  }

  // 1. Loading state -> Branded loading screen
  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-content">
          <Loader2 className="auth-spinner" size={40} />
          <p className="auth-loading-text">Restoring TrustNet Session...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Redirect to login page
  if (authState === 'unauthenticated' || !currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  // 3. Authenticated but NOT authorized (Not an admin) -> Access Denied Screen
  if (authState === 'unauthorized' || currentUser.role !== 'admin') {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon-wrapper">
            <ShieldAlert size={48} />
          </div>
          <h1 className="access-denied-title">Access Denied</h1>
          <p className="access-denied-message">
            Your account (<strong>{currentUser.email}</strong>) does not have administrative privileges. 
            Only verified administrators can access the TrustNet Admin Dashboard.
          </p>
          <div className="access-denied-actions">
            <button className="btn btn-primary logout-action-btn" onClick={logout}>
              <LogOut size={16} />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin -> Render Child Route Outlet
  return <Outlet />;
}
