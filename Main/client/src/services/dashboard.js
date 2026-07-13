import api from "./api";

export async function getDashboard() {
  const { data } = await api.get("/v1/dashboard");
  return data?.data ?? data;
}
