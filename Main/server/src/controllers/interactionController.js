const interactionService = require("../services/interactionService");

async function likePost(req, res) {
  try {
    const result = await interactionService.likePost(req.params.id, req.user.email);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function unlikePost(req, res) {
  try {
    const result = await interactionService.unlikePost(req.params.id, req.user.email);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function listComments(req, res) {
  try {
    const comments = await interactionService.listComments(req.params.id, req.query.options || {});
    return res.status(200).json({ success: true, data: comments });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function addComment(req, res) {
  try {
    const comment = await interactionService.addComment(
      req.params.id,
      req.user.email,
      req.body.content
    );
    return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateComment(req, res) {
  try {
    const comment = await interactionService.updateComment(
      req.params.commentId,
      req.user.email,
      req.body.content
    );
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function deleteComment(req, res) {
  try {
    const result = await interactionService.deleteComment(req.params.commentId, req.user.email);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  likePost,
  unlikePost,
  listComments,
  addComment,
  updateComment,
  deleteComment,
};
