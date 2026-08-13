import { apiClient } from '../services/apiClient';

export async function listInvestors(filter = {}, options = {}) {
  const queryParts = [];
  if (filter.preferredStages) queryParts.push(`filter[preferredStages]=${encodeURIComponent(filter.preferredStages)}`);
  if (filter.preferredIndustries) queryParts.push(`filter[preferredIndustries]=${encodeURIComponent(filter.preferredIndustries)}`);
  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiClient.get(`/investors${query}`);
  return res?.data || res || [];
}

export async function getInvestorProfile(id) {
  const res = await apiClient.get(`/investors/${id}`);
  return res?.data || res;
}

export async function createInvestorProfile(payload) {
  const res = await apiClient.post('/investors', payload);
  return res?.data || res;
}

export async function updateInvestorProfile(id, payload) {
  const res = await apiClient.put(`/investors/${id}`, payload);
  return res?.data || res;
}
