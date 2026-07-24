import api from "./api";

export async function getCommunities(params = {}) {
  const { data } = await api.get("/communities", { params });
  return data?.data ?? data;
}

export async function createCommunity(payload) {
  const { data } = await api.post("/communities", payload);
  return data?.data ?? data;
}

export async function updateCommunity(id, payload) {
  const { data } = await api.put(`/communities/${id}`, payload);
  return data?.data ?? data;
}

export async function deleteCommunity(id) {
  const { data } = await api.delete(`/communities/${id}`);
  return data?.data ?? data;
}
