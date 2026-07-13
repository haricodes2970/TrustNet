const postService = require("../services/postService");

async function createPost(req, res) {
  try {
    const post = await postService.createPost(req.body);
    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getPost(req, res) {
  try {
    const post = await postService.getPostById(req.params.id);
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function updatePost(req, res) {
  try {
    const post = await postService.updatePost(req.params.id, req.body);
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deletePost(req, res) {
  try {
    const post = await postService.deletePost(req.params.id);
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

async function listPosts(req, res) {
  try {
    const posts = await postService.listPosts(req.query.filter || {}, req.query.options || {});
    return res.status(200).json({ success: true, data: posts });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createPost,
  getPost,
  updatePost,
  deletePost,
  listPosts,
};
