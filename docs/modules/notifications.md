# Module: Notifications

Files: `src/routes/notification.routes.js`, `src/controllers/notificationController.js`, `src/services/notificationService.js`, `src/models/Notification.js`. See [DATABASE.md](../../DATABASE.md#notification-notificationjs).

## Routes (`/api/v1/notifications`) — all auth required

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | list notifications |
| GET | `/unread-count` | unread count |
| PUT | `/:id/read` | mark one read |
| PUT | `/read-all` | mark all read |
| DELETE | `/:id` | delete |

## Controller (`notificationController.js`)

`listNotifications`, `getUnreadCount`, `markRead`, `markAllRead`, `deleteNotification`.

## Service (`notificationService.js`)

`createNotification`, `getNotificationById`, `listNotifications`, `markRead`, `markAllRead`, `deleteNotification`, `getUnreadCount`.

## Notes

`Notification.data` is Mixed-typed — payload shape varies by `type` string (no enum enforced on `type`). Consumed by [teams.md](teams.md) (invite notifications) among others. Email delivery per user preference (`UserPreference.emailNotifications`) is a Phase 6 backlog item — see [BACKLOG.md](../../BACKLOG.md).
