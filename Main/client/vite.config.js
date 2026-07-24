import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No dev proxy -- the API client uses an absolute VITE_API_URL (see
// src/services/api.js, .env.example) instead of a relative path proxied
// through Vite, so this config no longer needs one.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
