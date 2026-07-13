import { useEffect, useMemo, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../services/notifications";

const TYPE_LABELS = {
  collaboration_request: "Collaboration",
  message: "Message",
};

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      setNotifications(Array.isArray(list) ? list : []);
      setUnreadCount(count?.unreadCount ?? 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (String(n._id) === String(id) ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(id);
    } catch (err) {
      load();
    }
  }, [load]);

  const handleMarkAll = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      load();
    }
  }, [load]);

  const handleDelete = useCallback(async (id) => {
    const removed = notifications.find((n) => String(n._id) === String(id));
    setNotifications((prev) => prev.filter((n) => String(n._id) !== String(id)));
    if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await deleteNotification(id);
    } catch (err) {
      load();
    }
  }, [notifications, load]);

  const unreadBadge = useMemo(() => {
    if (unreadCount <= 0) return null;
    return (
      <Badge className="ml-2 bg-primary text-primary-foreground">
        {unreadCount} unread
      </Badge>
    );
  }, [unreadCount]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          {unreadBadge}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAll}
          disabled={loading || unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card text-muted-foreground">
          Loading notifications…
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <Bell className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No notifications yet</p>
          <p className="text-sm text-muted-foreground">
            You'll see collaboration requests and messages here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-card transition-colors",
                n.read ? "border-border" : "border-primary/40 bg-primary/5"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {n.type && (
                    <Badge variant="secondary" className="capitalize">
                      {TYPE_LABELS[n.type] || n.type}
                    </Badge>
                  )}
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatTime(n.createdAt)}
                  </span>
                </div>
                {n.title && (
                  <p className="mt-1.5 text-sm font-semibold text-foreground">{n.title}</p>
                )}
                {n.message && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMarkRead(n._id)}
                    aria-label="Mark as read"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(n._id)}
                  aria-label="Delete notification"
                  title="Delete"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
