import api from "./api";

export async function getStartups(params = {}) {
  const { data } = await api.get("/v1/startups", { params });
  return data?.data ?? data;
}

export async function createStartup(payload) {
  const { data } = await api.post("/v1/startups", payload);
  return data?.data ?? data;
}

export async function updateStartup(id, payload) {
  const { data } = await api.put(`/v1/startups/${id}`, payload);
  return data?.data ?? data;
}

export async function deleteStartup(id) {
  const { data } = await api.delete(`/v1/startups/${id}`);
  return data?.data ?? data;
}
