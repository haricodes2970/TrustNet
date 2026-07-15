import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { AppLayout } from "./components/layout/app-layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import OAuthCallback from "./pages/OAuthCallback";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Connections from "./pages/Connections";
import Communities from "./pages/Communities";
import Startups from "./pages/Startups";
import Posts from "./pages/Posts";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Verification from "./pages/Verification";
import VerificationInProgress from "./pages/VerificationInProgress";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.verificationStatus === "pending") {
    return <Navigate to="/verification-in-progress" replace />;
  }
  if (user.verificationStatus !== "approved") {
    return <Navigate to="/verification" replace />;
  }
  return <AppLayout />;
}

function VerificationRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.verificationStatus === "pending") return <Navigate to="/verification-in-progress" replace />;
  if (user.verificationStatus === "approved") return <Navigate to="/dashboard" replace />;
  return <Verification />;
}

function VerificationInProgressRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.verificationStatus === "approved") return <Navigate to="/dashboard" replace />;
  if (user.verificationStatus !== "pending") return <Navigate to="/verification" replace />;
  return <VerificationInProgress />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verification" element={<VerificationRoute />} />
            <Route path="/verification-in-progress" element={<VerificationInProgressRoute />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="/dashboard" element={<ProtectedLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="messages" element={<Messages />} />
              <Route path="connections" element={<Connections />} />
              <Route path="communities" element={<Communities />} />
              <Route path="startups" element={<Startups />} />
              <Route path="posts" element={<Posts />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="verification" element={<Verification />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
