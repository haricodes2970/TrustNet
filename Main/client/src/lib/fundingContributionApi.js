import { apiClient } from '../services/apiClient';

export async function listFundingContributions(params = {}) {
  const queryParts = [];
  if (params.fundingRoundId) queryParts.push(`fundingRoundId=${encodeURIComponent(params.fundingRoundId)}`);
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  const query = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiClient.get(`/funding-contributions${query}`);
  return res?.data || res || [];
}

export async function getFundingContribution(id) {
  const res = await apiClient.get(`/funding-contributions/${id}`);
  return res?.data || res;
}

export async function createFundingContribution(payload) {
  const res = await apiClient.post('/funding-contributions', payload);
  return res?.data || res;
}

export async function confirmFundingContribution(id) {
  const res = await apiClient.put(`/funding-contributions/${id}/confirm`);
  return res?.data || res;
}

export async function rejectFundingContribution(id) {
  const res = await apiClient.put(`/funding-contributions/${id}/reject`);
  return res?.data || res;
}

export async function withdrawFundingContribution(id) {
  const res = await apiClient.put(`/funding-contributions/${id}/withdraw`);
  return res?.data || res;
}
