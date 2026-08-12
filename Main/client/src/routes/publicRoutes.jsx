import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';

const LandingPage = lazy(() => import('../pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const AboutPage = lazy(() => import('../pages/landing/AboutPage').then(m => ({ default: m.AboutPage })));
const PricingPage = lazy(() => import('../pages/landing/PricingPage').then(m => ({ default: m.PricingPage })));
const ComingSoonPage = lazy(() => import('../components/common/SystemStates').then(m => ({ default: m.ComingSoonPage })));

// Public marketing website (PublicLayout chrome).
export const publicRoutes = (
  <Route path="/" element={<PublicLayout />}>
    <Route index element={<LandingPage />} />
    <Route path="about" element={<AboutPage />} />
    <Route path="pricing" element={<PricingPage />} />
    <Route path="features" element={<ComingSoonPage />} />
    <Route path="contact" element={<AboutPage />} />
    <Route path="faq" element={<AboutPage />} />
  </Route>
);
