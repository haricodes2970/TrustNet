import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';

const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('../pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const VerifyOtpPage = lazy(() => import('../pages/auth/VerifyOtpPage').then(m => ({ default: m.VerifyOtpPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const OAuthCallbackPage = lazy(() => import('../pages/auth/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })));
const OnboardingWizard = lazy(() => import('../pages/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));

// Authentication + onboarding. AuthLayout for the credentialed forms; OAuth
// callback and onboarding intentionally render without the auth chrome.
export const authRoutes = (
  <React.Fragment>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>
    <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
    <Route path="/onboarding" element={<OnboardingWizard />} />
  </React.Fragment>
);
