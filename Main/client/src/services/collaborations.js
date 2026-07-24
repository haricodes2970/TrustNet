import api from "./api";

export async function getCollaborationRequests(params = {}) {
  const { data } = await api.get("/collaborations", { params });
  return data?.data ?? data;
}

export async function getCollaborationRequest(id) {
  const { data } = await api.get(`/collaborations/${id}`);
  return data?.data ?? data;
}

export async function createCollaborationRequest(payload) {
  const { data } = await api.post("/collaborations/request", payload);
  return data?.data ?? data;
}

export async function updateCollaborationRequest(id, payload) {
  const { data } = await api.put(`/collaborations/${id}`, payload);
  return data?.data ?? data;
}

export async function deleteCollaborationRequest(id) {
  const { data } = await api.delete(`/collaborations/${id}`);
  return data?.data ?? data;
}
