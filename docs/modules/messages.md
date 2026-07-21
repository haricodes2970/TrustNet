# Module: Messages

Files: `src/routes/message.routes.js`, `src/controllers/messageController.js`, `src/services/messageService.js`, `src/validators/message.validators.js`, `src/models/Conversation.js`, `src/models/Message.js`. See [DATABASE.md](../../DATABASE.md#conversation-conversationjs).

## Routes (`/api/v1/messages`) — all auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/conversations` | list user's conversations |
| POST | `/conversations` | create/open conversation (validated) |
| GET | `/conversations/:id` | get one conversation |
| DELETE | `/conversations/:id` | delete conversation |
| GET | `/conversations/:id/messages` | list messages |
| POST | `/conversations/:id/messages` | send message (validated) |
| PUT | `/conversations/:id/messages/:messageId/read` | mark message read |
| DELETE | `/conversations/:id/messages/:messageId` | delete own message |
| GET | `/unread-count` | unread message count |

## Controller (`messageController.js`)

`createConversation`, `getConversation`, `listConversations`, `deleteConversation`, `sendMessage`, `listMessages`, `markMessageRead`, `deleteMessage`, `getUnreadCount`.

## Service (`messageService.js`)

Mirrors controller functions at the persistence layer.

## Validation

`message.validators.js`: `createConversation`, `sendMessage`.

## Notes

`getUnreadCount` is flagged as an N+1 risk in [ROADMAP.md](../../ROADMAP.md) Phase 5 / [BACKLOG.md](../../BACKLOG.md). Real-time delivery mechanism (WebSocket/SSE/polling) is an open design question — see [ROADMAP.md](../../ROADMAP.md#open-questions-from-backlog-appendix-b).
