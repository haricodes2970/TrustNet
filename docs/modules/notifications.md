# Module: Notifications

Files: `src/routes/notification.routes.js`, `src/controllers/notificationController.js`, `src/services/notificationService.js`, `src/models/Notification.js`. See [DATABASE.md](../../DATABASE.md#notification-notificationjs).

Audited and hardened alongside [messages.md](messages.md) in the Messaging + Notifications phase.

## Routes (`/api/v1/notifications`) — all auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | list notifications (`?read=true\|false`, `?type=`, `?search=`, pagination) |
| GET | `/unread-count` | unread count |
| PUT | `/:id/read` | mark one read |
| PUT | `/read-all` | mark all read |
| DELETE | `/:id` | delete |

## What changed this phase

- **Filtering** (explicit requirement) - `listNotifications` previously returned the caller's entire notification history with no way to narrow it. Added `read`/`type` filters plus `search` on title/message.
- Every "not found" throw was a plain `Error` → controllers fell back to `400` for `markRead`/`deleteNotification`'s not-found case instead of `404`; fixed via `ApiError` throughout.
- `recipient` is forced after the filter spread in `listNotifications` so no caller can widen a query to another user's notifications (mirrors the same forced-scope pattern applied to `Conversation.participants`/`Message.conversation` this phase).
- Audit logging added on `markRead`/`markAllRead`/`deleteNotification`. Caught its own bug in the process: `markAllRead`'s log call passed `null` as `targetId`, but `AuditLog.targetId` is required - every call was silently failing to log. Fixed by using the actor's own id (a bulk action has no single target document).
- **No admin override added** - a personal notification inbox has no legitimate "admin reads/clears on your behalf" use case, unlike Messaging's moderation/investigation rationale for its own admin bypass.

## Removed

- `resolveCurrentUserId()` (`userService.getUserByEmail(req.user.email)` on every single request) - same fix as `messageController.js`, closing the same tracked BACKLOG "per-request user lookups" item for this module.

## Notification triggers - reviewed, not changed

Per this phase's explicit instruction ("do not implement new notification triggers, only verify compatibility"): `createNotification`'s signature and behavior were confirmed unchanged and correct for the one existing caller (`messageService.sendMessage`, wrapped in try/catch so a notification failure never blocks message delivery) plus `collaborationService`/`teamService`'s existing calls. `Notification.data` stays `Mixed`-typed with no enum on `type` - payload shape intentionally varies by trigger, unchanged from the pre-existing design.

## Tests

**Integration** (`test/integration/messagingLifecycle.test.js`, shared with Messages, new this phase - this module had zero test coverage before): read/type filtering, ownership enforcement on mark-read/delete, `markAllRead`, and the Message → Notification trigger verified end-to-end.
