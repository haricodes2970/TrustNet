// Calls the real backend Marketplace module (service-listing.routes.js).
// Public listing endpoint -- no auth required to browse.
import { apiClient } from './apiClient';

export async function listServiceListings(filter = {}, options = {}) {
  return apiClient.get('/service-listings', { filter, options });
}

export async function getServiceListing(id) {
  return apiClient.get(`/service-listings/${id}`);
}

export async function publishListing(id) {
  return apiClient.put(`/service-listings/${id}/publish`);
}

export async function unpublishListing(id) {
  return apiClient.put(`/service-listings/${id}/unpublish`);
}

export async function archiveListing(id) {
  return apiClient.delete(`/service-listings/${id}`);
}

export async function restoreListing(id) {
  return apiClient.post(`/service-listings/${id}/restore`);
}
