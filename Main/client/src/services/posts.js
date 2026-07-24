import api from "./api";

export async function getPosts(params = {}) {
  const { data } = await api.get("/posts", { params });
  return data?.data ?? data;
}

export async function getPost(id) {
  const { data } = await api.get(`/posts/${id}`);
  return data?.data ?? data;
}

export async function createPost(payload) {
  const { data } = await api.post("/posts", payload);
  return data?.data ?? data;
}

export async function updatePost(id, payload) {
  const { data } = await api.put(`/posts/${id}`, payload);
  return data?.data ?? data;
}

export async function deletePost(id) {
  const { data } = await api.delete(`/posts/${id}`);
  return data?.data ?? data;
}
