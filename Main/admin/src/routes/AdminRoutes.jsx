import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AdminOverview from '../pages/AdminOverview';
import VerificationCenter from '../pages/VerificationCenter';
import VerificationDetail from '../pages/VerificationDetail';
import UsersManagement from '../pages/UsersManagement';
import UserDetail from '../pages/UserDetail';
import StartupsManagement from '../pages/StartupsManagement';
import StartupDetail from '../pages/StartupDetail';
import EcosystemUnavailablePage from '../pages/EcosystemUnavailablePage';
import ContentModeration from '../pages/ContentModeration';
import PlatformAnalytics from '../pages/PlatformAnalytics';
import AuditLogs from '../pages/AuditLogs';
import SystemSettings from '../pages/SystemSettings';
import Login from '../pages/Login';
import ProtectedRoute from '../components/auth/ProtectedRoute';

export default function AdminRoutes() {
  return (
    <Routes>
      {/* Root redirect to /admin */}
      <Route path="/" element={<Navigate to="/admin" replace />} />

      {/* Public Login Route */}
      <Route path="/admin/login" element={<Login />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          {/* /admin - Overview Dashboard */}
          <Route index element={<AdminOverview />} />

          {/* Active sub-routes */}
          <Route path="verification" element={<VerificationCenter />} />
          <Route path="verification/:id" element={<VerificationDetail />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="startups" element={<StartupsManagement />} />
          <Route path="startups/:id" element={<StartupDetail />} />
          <Route path="investors" element={<EcosystemUnavailablePage />} />
          <Route path="investors/:id" element={<EcosystemUnavailablePage />} />
          <Route path="mentors" element={<EcosystemUnavailablePage />} />
          <Route path="mentors/:id" element={<EcosystemUnavailablePage />} />
          <Route path="moderation" element={<ContentModeration />} />
          <Route path="reports" element={<EcosystemUnavailablePage />} />
          <Route path="reports/:id" element={<EcosystemUnavailablePage />} />
          <Route path="analytics" element={<PlatformAnalytics />} />
          <Route path="notifications" element={<EcosystemUnavailablePage />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings" element={<SystemSettings />} />

          {/* Fallback for unknown /admin/* paths */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>

      {/* Global Fallback redirect to /admin */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
