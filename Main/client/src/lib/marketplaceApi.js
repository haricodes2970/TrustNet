// Calls the real backend Marketplace module (service-listing.routes.js).
// Public listing endpoint -- no auth required to browse.
import { apiClient } from './apiClient';

export async function listServiceListings(filter = {}, options = {}) {
  const query = {};

  if (filter.provider) query.providerId = filter.provider;
  if (filter.search) query.search = filter.search;

  if (options.limit !== undefined) query.limit = options.limit;
  if (options.skip !== undefined) query.skip = options.skip;
  if (options.sort !== undefined) query.sort = options.sort;

  return apiClient.get('/service-listings', query);
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

export async function getProviderProfile(id) {
  return apiClient.get(`/provider-profiles/${id}`);
}
