import api from "./api";

export async function getStartups(params = {}) {
  const { data } = await api.get("/startups", { params });
  return data?.data ?? data;
}

export async function createStartup(payload) {
  const { data } = await api.post("/startups", payload);
  return data?.data ?? data;
}

export async function updateStartup(id, payload) {
  const { data } = await api.put(`/startups/${id}`, payload);
  return data?.data ?? data;
}

export async function deleteStartup(id) {
  const { data } = await api.delete(`/startups/${id}`);
  return data?.data ?? data;
}
