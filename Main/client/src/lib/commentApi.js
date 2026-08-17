// Calls the real backend Post Comments routes (src/routes/post.routes.js).
import { apiClient } from './apiClient';

export async function listComments(postId) {
  return apiClient.get(`/posts/${postId}/comments`);
}

export async function addComment(postId, content) {
  return apiClient.post(`/posts/${postId}/comments`, { content });
}

export async function updateComment(commentId, content) {
  return apiClient.put(`/posts/comments/${commentId}`, { content });
}

export async function deleteComment(commentId) {
  return apiClient.delete(`/posts/comments/${commentId}`);
}

export async function restoreComment(commentId) {
  return apiClient.post(`/posts/comments/${commentId}/restore`);
}
