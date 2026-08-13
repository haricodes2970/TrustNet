import { apiClient } from '../services/apiClient';

export async function listFundingRounds(params = {}) {
  const queryParts = [];
  if (params.startupId) queryParts.push(`startupId=${encodeURIComponent(params.startupId)}`);
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiClient.get(`/funding-rounds${query}`);
  return res?.data || res || [];
}

export async function getFundingRound(id) {
  const res = await apiClient.get(`/funding-rounds/${id}`);
  return res?.data || res;
}

export async function createFundingRound(payload) {
  const res = await apiClient.post('/funding-rounds', payload);
  return res?.data || res;
}

export async function updateFundingRound(id, payload) {
  const res = await apiClient.put(`/funding-rounds/${id}`, payload);
  return res?.data || res;
}

export async function openFundingRound(id) {
  const res = await apiClient.put(`/funding-rounds/${id}/open`);
  return res?.data || res;
}

export async function closeFundingRound(id) {
  const res = await apiClient.put(`/funding-rounds/${id}/close`);
  return res?.data || res;
}

export async function cancelFundingRound(id) {
  const res = await apiClient.put(`/funding-rounds/${id}/cancel`);
  return res?.data || res;
}

export async function archiveFundingRound(id) {
  const res = await apiClient.delete(`/funding-rounds/${id}`);
  return res?.data || res;
}
