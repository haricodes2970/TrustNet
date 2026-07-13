import api from "./api";

export async function getCollaborationRequests(params = {}) {
  const { data } = await api.get("/v1/collaborations", { params });
  return data?.data ?? data;
}

export async function getCollaborationRequest(id) {
  const { data } = await api.get(`/v1/collaborations/${id}`);
  return data?.data ?? data;
}

export async function createCollaborationRequest(payload) {
  const { data } = await api.post("/v1/collaborations/request", payload);
  return data?.data ?? data;
}

export async function updateCollaborationRequest(id, payload) {
  const { data } = await api.put(`/v1/collaborations/${id}`, payload);
  return data?.data ?? data;
}

export async function deleteCollaborationRequest(id) {
  const { data } = await api.delete(`/v1/collaborations/${id}`);
  return data?.data ?? data;
}
