import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { DevAuthProvider } from './dev/DevAuthProvider';

// Route registry (per-domain modules live under src/routes/)
import { AppRoutes } from './routes';

// Fallback Suspense skeleton
import { SkeletonPage } from './components/ui/SkeletonLoaders';

export function App() {
  // The dev provider can assist local UI development only; a production
  // bundle must always use the real session-backed provider.
  const ActiveAuthProvider = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === '1'
    ? DevAuthProvider
    : AuthProvider;

  return (
    <ThemeProvider>
      <ActiveAuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Suspense fallback={<SkeletonPage />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </AppProvider>
      </ActiveAuthProvider>
    </ThemeProvider>
  );
}

export default App;
