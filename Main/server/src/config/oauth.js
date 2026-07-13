const env = require('./env');

// IMPORTANT: the redirect URI is deliberately built on top of CLIENT_URL
// (the frontend dev-server origin, e.g. http://localhost:5173) and NOT the
// backend origin (e.g. http://localhost:5000). The frontend's Vite dev
// server proxies /api/* straight through to the backend, so routing the
// OAuth redirect through CLIENT_URL keeps the *entire* flow on a single
// browser-visible origin. That matters because the cookies this flow sets
// (oauth_state, the refresh-token cookie) must be visible to that same
// origin the frontend calls when it later makes normal /api requests. If
// the redirect_uri pointed straight at the backend port instead, the
// browser would briefly "leave" the frontend origin and any cookies set
// during that hop would be scoped to the wrong origin.
//
// Register these EXACT redirect URIs in the Google Cloud Console / LinkedIn
// Developer Portal (must match exactly, including port, in development):
//   Google:   {CLIENT_URL}/api/v1/auth/google/callback
//   LinkedIn: {CLIENT_URL}/api/v1/auth/linkedin/callback

module.exports = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${env.CLIENT_URL}/api/v1/auth/google/callback`,
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || `${env.CLIENT_URL}/api/v1/auth/linkedin/callback`,
  },
};