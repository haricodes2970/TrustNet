import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts & Guard
import { PublicLayout } from './layouts/PublicLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Fallback Suspense Skeleton Loader
import { SkeletonPage } from './components/ui/SkeletonLoaders';

// Lazy Loaded Pages
const LandingPage = lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const AboutPage = lazy(() => import('./pages/landing/AboutPage').then(m => ({ default: m.AboutPage })));
const PricingPage = lazy(() => import('./pages/landing/PricingPage').then(m => ({ default: m.PricingPage })));

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const VerifyOtpPage = lazy(() => import('./pages/auth/VerifyOtpPage').then(m => ({ default: m.VerifyOtpPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AccessDeniedPage = lazy(() => import('./pages/auth/AccessDeniedPage').then(m => ({ default: m.AccessDeniedPage })));
const OAuthCallbackPage = lazy(() => import('./pages/auth/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })));

// Onboarding
const OnboardingWizard = lazy(() => import('./pages/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));

// Core SaaS Modules
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FeedPage = lazy(() => import('./pages/feed/FeedPage').then(m => ({ default: m.FeedPage })));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const EditProfilePage = lazy(() => import('./pages/profile/EditProfilePage').then(m => ({ default: m.EditProfilePage })));
const PeoplePage = lazy(() => import('./pages/people/PeoplePage').then(m => ({ default: m.PeoplePage })));

// Startup Operating System
const StartupsPage = lazy(() => import('./pages/startups/StartupsPage').then(m => ({ default: m.StartupsPage })));
const MyStartupsPage = lazy(() => import('./pages/startups/MyStartupsPage').then(m => ({ default: m.MyStartupsPage })));
const StartupDiscoveryPage = lazy(() => import('./pages/startups/StartupDiscoveryPage').then(m => ({ default: m.StartupDiscoveryPage })));
const StartupDetailPage = lazy(() => import('./pages/startups/StartupDetailPage').then(m => ({ default: m.StartupDetailPage })));
const CreateStartupPage = lazy(() => import('./pages/startups/CreateStartupPage').then(m => ({ default: m.CreateStartupPage })));
const StartupManagementDashboard = lazy(() => import('./pages/startups/StartupManagementDashboard').then(m => ({ default: m.StartupManagementDashboard })));
const StartupTeamPage = lazy(() => import('./pages/startups/StartupTeamPage').then(m => ({ default: m.StartupTeamPage })));

// Scheduler & Utilities
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));
const DesignSystemPage = lazy(() => import('./pages/admin/DesignSystemPage').then(m => ({ default: m.DesignSystemPage })));

// Marketplace & Directories
const InvestorsPage = lazy(() => import('./pages/investors/InvestorsPage').then(m => ({ default: m.InvestorsPage })));
const MentorsPage = lazy(() => import('./pages/mentors/MentorsPage').then(m => ({ default: m.MentorsPage })));
const CommunitiesPage = lazy(() => import('./pages/communities/CommunitiesPage').then(m => ({ default: m.CommunitiesPage })));
const OpportunitiesPage = lazy(() => import('./pages/opportunities/OpportunitiesPage').then(m => ({ default: m.OpportunitiesPage })));
const EventsPage = lazy(() => import('./pages/events/EventsPage').then(m => ({ default: m.EventsPage })));

// Workspace
const MessagingPage = lazy(() => import('./pages/messaging/MessagingPage').then(m => ({ default: m.MessagingPage })));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const WorkspacePage = lazy(() => import('./pages/workspace/WorkspacePage').then(m => ({ default: m.WorkspacePage })));

// Extended Modules
const ConnectionsPage = lazy(() => import('./pages/connections/ConnectionsPage').then(m => ({ default: m.ConnectionsPage })));
const SavedPage = lazy(() => import('./pages/saved/SavedPage').then(m => ({ default: m.SavedPage })));
const VerificationPage = lazy(() => import('./pages/verification/VerificationPage').then(m => ({ default: m.VerificationPage })));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const HelpPage = lazy(() => import('./pages/help/HelpPage').then(m => ({ default: m.HelpPage })));
const FilesPage = lazy(() => import('./pages/files/FilesPage').then(m => ({ default: m.FilesPage })));
const ActivityPage = lazy(() => import('./pages/activity/ActivityPage').then(m => ({ default: m.ActivityPage })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Fallback System Pages
const MaintenancePage = lazy(() => import('./components/common/SystemStates').then(m => ({ default: m.MaintenancePage })));
const ComingSoonPage = lazy(() => import('./components/common/SystemStates').then(m => ({ default: m.ComingSoonPage })));
const NotFoundPage = lazy(() => import('./pages/errors/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Backend modules with no page in the original design -- minimal stubs
// added during integration (see integration report).
const MarketplacePage = lazy(() => import('./pages/marketplace/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AIInsightsPage = lazy(() => import('./pages/ai/AIInsightsPage').then(m => ({ default: m.AIInsightsPage })));

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Suspense fallback={<SkeletonPage />}>
              <Routes>
                {/* Public Landing Website */}
                <Route path="/" element={<PublicLayout />}>
                  <Route index element={<LandingPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="features" element={<ComingSoonPage />} />
                  <Route path="contact" element={<AboutPage />} />
                  <Route path="faq" element={<AboutPage />} />
                </Route>

                {/* Authentication Flow */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/verify-otp" element={<VerifyOtpPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>

                {/* OAuth redirect target -- outside AuthLayout, no chrome needed */}
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

                {/* Onboarding Wizard */}
                <Route path="/onboarding" element={<OnboardingWizard />} />

                {/* Logged-In SaaS Application -- requires a real, backend-
                    verified session (GET /auth/me). Previously unprotected. */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="feed" element={<FeedPage />} />

                  {/* Profile */}
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="profile/edit" element={<EditProfilePage />} />
                  <Route path="profile/settings" element={<SettingsPage />} />

                  {/* People */}
                  <Route path="people" element={<PeoplePage />} />
                  <Route path="people/:id" element={<ProfilePage />} />
                  <Route path="network" element={<PeoplePage />} />

                  {/* Startup Operating System */}
                  <Route path="discover" element={<StartupDiscoveryPage />} />
                  <Route path="startups" element={<MyStartupsPage />} />
                  <Route path="startups/discover" element={<StartupDiscoveryPage />} />
                  <Route path="startups/my" element={<Navigate to="/app/startups" replace />} />
                  <Route path="startups/create" element={<CreateStartupPage />} />
                  <Route path="startups/:id" element={<StartupDetailPage />} />
                  <Route path="startups/:id/manage" element={<StartupManagementDashboard />} />
                  <Route path="startups/:id/team" element={<StartupTeamPage />} />

                  {/* Role Specializations */}
                  <Route path="investor" element={<DashboardPage />} />
                  <Route path="mentor" element={<DashboardPage />} />

                  {/* Calendar & Productivity -- no backend module exists
                      (Calendar/Events were never part of the roadmap or the
                      FounderVerse spec's built scope); disabled gracefully. */}
                  <Route path="calendar" element={<ComingSoonPage />} />

                  {/* Directories & Marketplace */}
                  <Route path="investors" element={<InvestorsPage />} />
                  {/* Mentors: User.role has a 'mentor' enum value but no
                      mentor-matching/session backend exists; disabled. */}
                  <Route path="mentors" element={<ComingSoonPage />} />
                  <Route path="communities" element={<CommunitiesPage />} />
                  <Route path="opportunities" element={<OpportunitiesPage />} />
                  {/* Events: no backend module; disabled. */}
                  <Route path="events" element={<ComingSoonPage />} />

                  {/* Communication & Workspace */}
                  <Route path="messages" element={<MessagingPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="workspace" element={<WorkspacePage />} />

                  {/* Backend modules with no page in the original design --
                      minimal stubs added during integration. */}
                  <Route path="marketplace" element={<MarketplacePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="ai" element={<AIInsightsPage />} />

                  {/* Extended Modules -- Connections/Saved/Activity/Help
                      have no backend equivalent (confirmed: no Connection/
                      Follower/Bookmark model or activity-feed/help-center
                      module exists); disabled gracefully. Analytics has a
                      real backend module but is not wired this pass (still
                      mock-data-driven) -- left as-is, out of scope. */}
                  <Route path="connections" element={<ComingSoonPage />} />
                  <Route path="saved" element={<ComingSoonPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="files" element={<FilesPage />} />
                  <Route path="activity" element={<ComingSoonPage />} />
                  <Route path="help" element={<ComingSoonPage />} />
                  <Route path="design-system" element={<DesignSystemPage />} />
                  <Route path="settings" element={<SettingsPage />} />

                  {/* Access Denied Route */}
                  <Route path="403" element={<AccessDeniedPage />} />

                  {/* Protected Admin Routes */}
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

                <Route path="/verification" element={<AppLayout />}>
                  <Route index element={<VerificationPage />} />
                </Route>

                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/coming-soon" element={<ComingSoonPage />} />

                {/* Fallback 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
