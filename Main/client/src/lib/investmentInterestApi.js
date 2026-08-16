import { apiClient } from '../services/apiClient';

export async function listInvestmentInterests(params = {}) {
  const queryParts = [];
  if (params.startupId) queryParts.push(`startupId=${encodeURIComponent(params.startupId)}`);
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiClient.get(`/investment-interests${query}`);
  return res?.data || res || [];
}

export async function getInvestmentInterest(id) {
  const res = await apiClient.get(`/investment-interests/${id}`);
  return res?.data || res;
}

export async function createInvestmentInterest(payload) {
  const res = await apiClient.post('/investment-interests', payload);
  return res?.data || res;
}

export async function updateInvestmentInterestStatus(id, status) {
  const res = await apiClient.put(`/investment-interests/${id}/status`, { status });
  return res?.data || res;
}

export async function archiveInvestmentInterest(id) {
  const res = await apiClient.delete(`/investment-interests/${id}`);
  return res?.data || res;
}

export async function withdrawInvestmentInterest(id) {
  const res = await apiClient.put(`/investment-interests/${id}/withdraw`);
  return res?.data || res;
}
