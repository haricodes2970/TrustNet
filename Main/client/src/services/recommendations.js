import api from "./api";

export async function getRecommendations() {
  const { data } = await api.get("/v1/recommendations");
  return data?.data ?? data;
}
