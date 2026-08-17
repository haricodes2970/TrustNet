// Legacy import path kept for backward compatibility. All network access
// now flows through the real backend client (lib/apiClient), which wraps the
// TrustNet /api/v1 surface and throws on failure. There are no mocks in the
// production client path.
export { apiClient, BASE_URL, getToken, setToken } from '../lib/apiClient';
