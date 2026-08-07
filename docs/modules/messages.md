# Module: Messages

Files: `src/routes/message.routes.js`, `src/controllers/messageController.js`, `src/services/messageService.js`, `src/validators/message.validators.js`, `src/models/Conversation.js`, `src/models/Message.js`. See [DATABASE.md](../../DATABASE.md#conversation-conversationjs).

Audited and hardened in the Messaging + Notifications phase. Same pre-hardening-era code as Community/Post (this module's own pre-phase doc had no documented intentional tradeoffs) - every issue below was a genuine bug.

## Routes (`/api/v1/messages`) — all auth required, `authorize()` populates `req.user.role` for the platform-admin override

| Method | Path | Purpose |
|---|---|---|
| GET | `/conversations` | list user's conversations (`?search=`, `?limit=`, `?skip=`, `?sort=`) |
| POST | `/conversations` | create/open conversation (validated; rejects a deleted/suspended other-participant) |
| GET | `/conversations/:id` | get one conversation (participant or platform admin) |
| DELETE | `/conversations/:id` | delete conversation (soft, restorable) |
| POST | `/conversations/:id/restore` | restore a deleted conversation |
| GET | `/conversations/:id/messages` | list messages (`?search=`, pagination) |
| POST | `/conversations/:id/messages` | send message (validated) |
| PUT | `/conversations/:id/messages/:messageId/read` | mark message read |
| PUT | `/conversations/:id/messages/:messageId` | edit your own message |
| DELETE | `/conversations/:id/messages/:messageId` | delete a message (soft, restorable; sender or platform admin) |
| POST | `/conversations/:id/messages/:messageId/restore` | restore a deleted message |
| GET | `/unread-count` | unread message count |

## What changed this phase

- **Critical: destructive delete.** `deleteConversation` was a hard delete that also hard-deleted every `Message` via `Message.deleteMany` - a single participant's action permanently destroyed the entire conversation history for every other participant, with no way back, and `Conversation` had no `deletedAt` field to soft-delete with in the first place. Added `deletedAt` to both `Conversation` and `Message`; both deletes are soft now, with `restoreConversation`/`restoreMessage`. Messages are no longer mass-deleted when their conversation is - the conversation's own `deletedAt` conceals the thread via the same "check parent state" pattern used throughout this codebase, rather than cascading writes to every message.
- **Edit message, finally implemented.** `Message.isEdited`/`editedAt` existed on the schema with nothing ever setting them. New `editMessage` (owner-only, blocked once the message is deleted).
- **`markMessageRead` had no authorization check at all** - any authenticated caller who knew a `conversationId`/`messageId` pair could mark it read regardless of participancy. Also a non-atomic fetch-mutate-`.save()`; rewritten as an atomic `$addToSet`, race-free regardless of how many participants mark read concurrently.
- **Broken read-status logic.** `readBy` always includes the sender (added at send time), so the previous `readBy.length >= 1` check made `status` flip to `"read"` immediately on send - before anyone else had seen it. New `computeMessageStatus` derives `sent`/`delivered`/`read` fresh from `readBy` vs. every participant *other than the sender*, every time (tested across a 3-person group).
- **Stale conversation preview.** `deleteMessage`/`editMessage`/`restoreMessage` now keep `Conversation.lastMessage` in sync instead of showing deleted/stale content forever.
- **Deleted/suspended-participant guard.** `createConversation` now rejects (404/409) a nonexistent or inactive other-participant, checked once at creation - same "guard only at the create boundary" convention every other module in this codebase uses (not re-checked on every subsequent message).
- **Platform-admin override** on get/list/delete (view/moderate only - sending is always as a real participant; no send-on-behalf-of feature exists or was requested).
- Status-code correction throughout (every throw was a plain `Error`).
- `getUnreadCount` now excludes deleted conversations/messages.
- Audit logging on every mutating action.
- `search` added to `listMessages` (content) and `listConversations` (title).

## Removed

- `resolveCurrentUserId()` (`userService.getUserByEmail(req.user.email)` on every single request) - the exact "per-request user lookups" item tracked in `BACKLOG.md`'s Phase 5 scalability section. `authenticate` already guarantees `req.user.id` references a real, persisted `User`; every handler uses it directly now.

## Attachments, Group Messaging, Integration - reviewed, not changed

- **Attachments** are plain URL strings (`Message.attachments: [String]`), validated as URIs by `sendMessage`'s Joi schema - no dedicated upload pipeline is wired to Messages (the client is expected to upload via the Documents module's existing storage/Cloudinary path and pass the resulting URL). This is the existing, intended shape, not a gap - no new upload plumbing was built this phase (would be a redesign, out of scope).
- **Group messaging** already worked correctly (`type: "group"`, N participants, `title`) - verified, no changes needed.
- **Integration with Communities/Posts/Hiring/Funding/Marketplace/Startup**: `Conversation`/`Message` have no coupling to any of those modules (purely User-to-User) - verified compatible; archiving/suspending a Startup or Workspace has no effect on existing conversations, by design.

## Tests

**Integration** (`test/integration/messagingLifecycle.test.js`, 13 HTTP-level tests, new this phase - this module had zero test coverage before): full Conversation + Message lifecycle, permission matrices, soft-delete/restore, read-status progression, unread-count accuracy, search, and the Message → Notification integration trigger.
