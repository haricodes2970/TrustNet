import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';


// Core
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FeedPage = lazy(() => import('../pages/feed/FeedPage').then(m => ({ default: m.FeedPage })));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const EditProfilePage = lazy(() => import('../pages/profile/EditProfilePage').then(m => ({ default: m.EditProfilePage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PeoplePage = lazy(() => import('../pages/people/PeoplePage').then(m => ({ default: m.PeoplePage })));

// Startup OS
const StartupsPage = lazy(() => import('../pages/startups/StartupsPage').then(m => ({ default: m.StartupsPage })));
const MyStartupsPage = lazy(() => import('../pages/startups/MyStartupsPage').then(m => ({ default: m.MyStartupsPage })));
const StartupDiscoveryPage = lazy(() => import('../pages/startups/StartupDiscoveryPage').then(m => ({ default: m.StartupDiscoveryPage })));
const StartupDetailPage = lazy(() => import('../pages/startups/StartupDetailPage').then(m => ({ default: m.StartupDetailPage })));
const CreateStartupPage = lazy(() => import('../pages/startups/CreateStartupPage').then(m => ({ default: m.CreateStartupPage })));
const StartupManagementDashboard = lazy(() => import('../pages/startups/StartupManagementDashboard').then(m => ({ default: m.StartupManagementDashboard })));

// Directories / workspace / extended
const InvestorsPage = lazy(() => import('../pages/investors/InvestorsPage').then(m => ({ default: m.InvestorsPage })));
const CommunitiesPage = lazy(() => import('../pages/communities/CommunitiesPage').then(m => ({ default: m.CommunitiesPage })));
const OpportunitiesPage = lazy(() => import('../pages/opportunities/OpportunitiesPage').then(m => ({ default: m.OpportunitiesPage })));
const MessagingPage = lazy(() => import('../pages/messaging/MessagingPage').then(m => ({ default: m.MessagingPage })));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const WorkspacePage = lazy(() => import('../pages/workspace/WorkspacePage').then(m => ({ default: m.WorkspacePage })));
const MarketplacePage = lazy(() => import('../pages/marketplace/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AIInsightsPage = lazy(() => import('../pages/ai/AIInsightsPage').then(m => ({ default: m.AIInsightsPage })));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const FilesPage = lazy(() => import('../pages/files/FilesPage').then(m => ({ default: m.FilesPage })));
const DesignSystemPage = lazy(() => import('../pages/admin/DesignSystemPage').then(m => ({ default: m.DesignSystemPage })));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AccessDeniedPage = lazy(() => import('../pages/auth/AccessDeniedPage').then(m => ({ default: m.AccessDeniedPage })));
const VerificationPage = lazy(() => import('../pages/verification/VerificationPage').then(m => ({ default: m.VerificationPage })));

// Upstream-only pages (teammate features) preserved alongside P0 routes.
const SearchPage = lazy(() => import('../pages/search/SearchPage').then(m => ({ default: m.SearchPage })));
const StartupTeamPage = lazy(() => import('../pages/startups/StartupTeamPage').then(m => ({ default: m.StartupTeamPage })));
const ProjectDetailPage = lazy(() => import('../pages/workspace/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const InvestmentReadinessPage = lazy(() => import('../pages/ai/InvestmentReadinessPage').then(m => ({ default: m.InvestmentReadinessPage })));
const MyServicesPage = lazy(() => import('../pages/provider/MyServicesPage').then(m => ({ default: m.MyServicesPage })));
const EngagementRequestsPage = lazy(() => import('../pages/engagementRequests/EngagementRequestsPage').then(m => ({ default: m.EngagementRequestsPage })));
const FundingMarketplacePage = lazy(() => import('../pages/marketplace/FundingMarketplacePage').then(m => ({ default: m.FundingMarketplacePage })));
const ServiceDetailPage = lazy(() => import('../pages/marketplace/ServiceDetailPage').then(m => ({ default: m.ServiceDetailPage })));
const StartupMarketplacePage = lazy(() => import('../pages/marketplace/StartupMarketplacePage').then(m => ({ default: m.StartupMarketplacePage })));

// System / fallback
const MaintenancePage = lazy(() => import('../components/common/SystemStates').then(m => ({ default: m.MaintenancePage })));
const ComingSoonPage = lazy(() => import('../components/common/SystemStates').then(m => ({ default: m.ComingSoonPage })));
const NotFoundPage = lazy(() => import('../pages/errors/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Logged-in app (requires a real backend-verified session via GET /auth/me),
// plus the verification flow and system/fallback routes.
export const appRoutes = (
  <React.Fragment>

    {/* =========================================================
        PROTECTED APPLICATION
        Requires admin-approved verification.
        ========================================================= */}
    <Route
      path="/app"
      element={
        <ProtectedRoute requireApprovedVerification>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/app/dashboard" replace />} />

      {/* Core */}
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="feed" element={<FeedPage />} />

      <Route path="profile" element={<ProfilePage />} />
      <Route path="profile/edit" element={<EditProfilePage />} />
      <Route path="profile/settings" element={<SettingsPage />} />

      <Route path="people" element={<PeoplePage />} />
      <Route path="people/:id" element={<ProfilePage />} />
      <Route path="network" element={<PeoplePage />} />

      {/* Startup OS */}
      <Route path="discover" element={<StartupDiscoveryPage />} />
      <Route path="startups" element={<StartupsPage />} />
      <Route path="startups/discover" element={<StartupDiscoveryPage />} />
      <Route path="startups/my" element={<MyStartupsPage />} />
      <Route path="startups/create" element={<CreateStartupPage />} />
      <Route path="startups/:id" element={<StartupDetailPage />} />
      <Route
        path="startups/:id/manage"
        element={<StartupManagementDashboard />}
      />
      <Route path="startups/:id/team" element={<StartupTeamPage />} />

      <Route path="investor" element={<DashboardPage />} />
      <Route path="mentor" element={<DashboardPage />} />

      {/* No backend module — disabled gracefully. */}
      <Route path="calendar" element={<ComingSoonPage />} />

      {/* Directories / Workspace */}
      <Route path="investors" element={<InvestorsPage />} />
      <Route path="mentors" element={<ComingSoonPage />} />
      <Route path="communities" element={<CommunitiesPage />} />
      <Route path="opportunities" element={<OpportunitiesPage />} />
      <Route path="events" element={<ComingSoonPage />} />

      {/* Communication */}
      <Route path="messages" element={<MessagingPage />} />
      <Route path="notifications" element={<NotificationsPage />} />

      {/* Workspace / Tools */}
      <Route path="workspace" element={<WorkspacePage />} />
      <Route path="workspace/:id" element={<WorkspacePage />} />
      <Route path="projects/:id" element={<ProjectDetailPage />} />
      <Route path="marketplace" element={<MarketplacePage />} />
      <Route path="discover/marketplace" element={<MarketplacePage />} />
      <Route path="marketplace/funding" element={<FundingMarketplacePage />} />
      <Route path="marketplace/startups" element={<StartupMarketplacePage />} />
      <Route path="service-listings/:id" element={<ServiceDetailPage />} />
      <Route path="provider/services" element={<MyServicesPage />} />
      <Route path="engagement-requests" element={<EngagementRequestsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="ai" element={<AIInsightsPage />} />
      <Route path="ai/investment-readiness" element={<InvestmentReadinessPage />} />

      <Route path="connections" element={<ComingSoonPage />} />
      <Route path="saved" element={<ComingSoonPage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="files" element={<FilesPage />} />
      <Route path="activity" element={<ComingSoonPage />} />
      <Route path="help" element={<ComingSoonPage />} />
      <Route path="design-system" element={<DesignSystemPage />} />
      <Route path="settings" element={<SettingsPage />} />

      <Route path="403" element={<AccessDeniedPage />} />

      {/* =========================================================
          ADMIN DASHBOARD
          Admins bypass the normal user verification gate.
          ========================================================= */}
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'Administrator']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin', 'Administrator']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
     </Route>


    {/* =========================================================
        ROOT-LEVEL REDIRECTS (legacy deep-link compatibility).
        Upstream routed these directly under /; the app layout lives
        under /app, so redirect for a single canonical home.
        ========================================================= */}
    <Route path="/feed" element={<Navigate to="/app/feed" replace />} />
    <Route path="/search" element={<Navigate to="/app/search" replace />} />
    <Route path="/notifications" element={<Navigate to="/app/notifications" replace />} />
    <Route path="/discover/marketplace" element={<Navigate to="/app/discover/marketplace" replace />} />
    <Route path="/service-listings/:id" element={<Navigate to="/app/service-listings/:id" replace />} />
    <Route path="/provider/services" element={<Navigate to="/app/provider/services" replace />} />
    <Route path="/engagement-requests" element={<Navigate to="/app/engagement-requests" replace />} />

    {/* =========================================================
        VERIFICATION FLOW
        IMPORTANT: NO AppLayout HERE.

        This means the verification page has:
        - no sidebar
        - no top navigation
        - no search
        - no Add Startup button
        - no application navigation

        It is a standalone protected page.
        ========================================================= */}
    <Route
      path="/verification"
      element={
        <ProtectedRoute requireVerifiedEmail>
          <VerificationPage />
        </ProtectedRoute>
      }
    />


    {/* =========================================================
        SYSTEM / FALLBACK ROUTES
        ========================================================= */}
    <Route
      path="/maintenance"
      element={<MaintenancePage />}
    />

    <Route
      path="/coming-soon"
      element={<ComingSoonPage />}
    />

    <Route
      path="*"
      element={<NotFoundPage />}
    />

  </React.Fragment>
);