import api from "./api";

export async function getCommunities(params = {}) {
  const { data } = await api.get("/v1/communities", { params });
  return data?.data ?? data;
}

export async function createCommunity(payload) {
  const { data } = await api.post("/v1/communities", payload);
  return data?.data ?? data;
}

export async function updateCommunity(id, payload) {
  const { data } = await api.put(`/v1/communities/${id}`, payload);
  return data?.data ?? data;
}

export async function deleteCommunity(id) {
  const { data } = await api.delete(`/v1/communities/${id}`);
  return data?.data ?? data;
}
