# Module: Posts & Interactions

Files: `src/routes/post.routes.js`, `src/controllers/postController.js`, `src/controllers/interactionController.js`, `src/services/postService.js`, `src/services/interactionService.js`, `src/validators/interaction.validators.js`, `src/models/Post.js`, `src/models/Comment.js`. See [DATABASE.md](../../DATABASE.md#post-postjs).

## Routes (`/api/v1/posts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | — (verify in code) | create post |
| GET | `/` | — | list posts (pageable) |
| GET | `/:id` | — | get by id |
| PUT | `/:id` | — (verify) | update |
| DELETE | `/:id` | — (verify) | delete |
| POST | `/:id/like` | required | like |
| DELETE | `/:id/like` | required | unlike |
| GET | `/:id/comments` | — | list comments |
| POST | `/:id/comments` | required | add comment (validated) |
| PUT | `/comments/:commentId` | required | edit comment |
| DELETE | `/comments/:commentId` | required | delete comment |

## Controllers

`postController.js`: `createPost`, `getPost`, `updatePost`, `deletePost`, `listPosts`.
`interactionController.js`: `likePost`, `unlikePost`, `listComments`, `addComment`, `updateComment`, `deleteComment`.

## Services

`postService.js`: `createPost`, `getPostById`, `updatePost`, `deletePost`, `listPosts`.
`interactionService.js`: like/unlike/comment operations.

## Validation

`interaction.validators.js`: `comment` schema for post comments.

## Notes

`Post` optionally links to `community` and/or `startup` ([DATABASE.md](../../DATABASE.md#relationships)). Text index on `{ title, content, tags }` backs [search.md](search.md). TODO: confirm create/update/delete auth requirements directly in `post.routes.js` — survey marked them uncertain.
