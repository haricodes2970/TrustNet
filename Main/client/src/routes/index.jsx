import React from 'react';
import { Routes } from 'react-router-dom';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { appRoutes } from './appRoutes';

// Single route registry, composed from the per-domain modules above. App.jsx
// imports this instead of holding the whole route tree — so adding a route
// touches one domain file, not the shared App shell.
export const AppRoutes = () => (
  <Routes>
    {publicRoutes}
    {authRoutes}
    {appRoutes}
  </Routes>
);
