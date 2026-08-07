const express = require("express");
const postController = require("../controllers/postController");
const interactionController = require("../controllers/interactionController");
const { authenticate, optionalAuthenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { postCreate, postUpdate } = require("../validators/post.validators");
const { comment } = require("../validators/interaction.validators");

const router = express.Router();

// POST/GET/PUT/DELETE previously had NO authenticate middleware at all -
// any caller, including an anonymous one, could create, edit, or delete any
// post. authorize() (no role list) populates req.user.role for the
// platform-admin override.
router.post("/", authenticate, validate(postCreate), postController.createPost);
router.get("/", optionalAuthenticate, postController.listPosts);
router.get("/:id", optionalAuthenticate, postController.getPost);
router.put("/:id", authenticate, authorize(), validate(postUpdate), postController.updatePost);
router.delete("/:id", authenticate, authorize(), postController.deletePost);
router.post("/:id/restore", authenticate, authorize(), postController.restorePost);

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
 *       404: { description: Post not found or not visible to the caller }
 *       409: { description: Already liked }
 */
router.post("/:id/like", authenticate, authorize(), interactionController.likePost);

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
 *       409: { description: Not currently liked }
 */
router.delete("/:id/like", authenticate, interactionController.unlikePost);

/**
 * @openapi
 * /posts/{id}/comments:
 *   get:
 *     summary: List comments on a post (respects the post's own visibility)
 *     tags: [Interactions]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: List of comments }
 *       404: { description: Post not found or not visible to the caller }
 */
router.get("/:id/comments", optionalAuthenticate, interactionController.listComments);

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
router.put("/comments/:commentId", authenticate, validate(comment), interactionController.updateComment);

/**
 * @openapi
 * /posts/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (owner or platform admin)
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: commentId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Comment deleted }
 */
router.delete("/comments/:commentId", authenticate, authorize(), interactionController.deleteComment);

/**
 * @openapi
 * /posts/comments/{commentId}/restore:
 *   post:
 *     summary: Restore your own deleted comment (owner or platform admin; blocked while the parent post is deleted)
 *     tags: [Interactions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: commentId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Comment restored }
 *       409: { description: Not deleted, or parent post still deleted }
 */
router.post("/comments/:commentId/restore", authenticate, authorize(), interactionController.restoreComment);

module.exports = router;
