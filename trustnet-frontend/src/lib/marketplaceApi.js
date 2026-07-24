// Calls the real backend Marketplace module (service-listing.routes.js).
// Public listing endpoint -- no auth required to browse.
import { apiClient } from './apiClient';

export async function listServiceListings(filter = {}, options = {}) {
  return apiClient.get('/service-listings', { filter, options });
}
