// Calls the real backend AI module (ai.routes.js). Authorization is
// inherited per-capability from the underlying service it wraps (see
// docs/modules/ai.md) -- this client makes no assumptions about who can
// call what, the backend enforces it and apiClient surfaces the error.
import { apiClient } from './apiClient';

export const AI_CAPABILITIES = [
  { value: 'startup-summary', label: 'Startup Summary' },
  { value: 'project-progress', label: 'Project Progress' },
  { value: 'hiring-insights', label: 'Hiring Insights' },
  { value: 'funding-summary', label: 'Funding Summary' },
  { value: 'marketplace-recommendations', label: 'Marketplace Recommendations' },
];

export async function generateInsight({ capability, startupId, question }) {
  return apiClient.post('/ai/insights', { capability, startupId, question });
}
