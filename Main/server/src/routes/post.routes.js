const express = require("express");
const postController = require("../controllers/postController");
const interactionController = require("../controllers/interactionController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { comment } = require("../validators/interaction.validators");

const router = express.Router();

router.post("/", postController.createPost);
router.get("/", postController.listPosts);
router.get("/:id", postController.getPost);
router.put("/:id", postController.updatePost);
router.delete("/:id", postController.deletePost);

/**
 * @openapi
 * /posts/{id}/like:
 *   post:
 *     summary: Like a post (one like per user)
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Post liked }
 */
router.post("/:id/like", authenticate, interactionController.likePost);

/**
 * @openapi
 * /posts/{id}/like:
 *   delete:
 *     summary: Remove the current user's like from a post
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Like removed }
 */
router.delete("/:id/like", authenticate, interactionController.unlikePost);

/**
 * @openapi
 * /posts/{id}/comments:
 *   get:
 *     summary: List comments on a post
 *     tags: [Interactions]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: List of comments }
 */
router.get("/:id/comments", interactionController.listComments);

/**
 * @openapi
 * /posts/{id}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Comment created }
 */
router.post("/:id/comments", authenticate, validate(comment), interactionController.addComment);

/**
 * @openapi
 * /posts/comments/{commentId}:
 *   put:
 *     summary: Edit a comment (owner only)
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: commentId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Comment updated }
 */
router.put(
  "/comments/:commentId",
  authenticate,
  validate(comment),
  interactionController.updateComment
);

/**
 * @openapi
 * /posts/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (owner only)
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: commentId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Comment deleted }
 */
router.delete("/comments/:commentId", authenticate, interactionController.deleteComment);

module.exports = router;
