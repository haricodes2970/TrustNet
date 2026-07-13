import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, MessageSquare, Newspaper, Plus, ThumbsUp } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getPosts, createPost } from "../services/posts";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const POST_TYPES = ["discussion", "announcement", "update", "pitch", "question"];

const EMPTY_FORM = { title: "", content: "", postType: "discussion", tags: "" };

export default function PostsPage() {
  const { user: authUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [postType, setPostType] = useState("all");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchesType = postType === "all" || p.postType === postType;
      const matchesQuery =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t?.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  }, [posts, query, postType]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim() || !form.content.trim()) {
      setFormError("Title and content are required.");
      return;
    }
    setSaving(true);
    try {
      await createPost({
        title: form.title.trim(),
        content: form.content.trim(),
        postType: form.postType,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      setMessage({ type: "success", text: "Post created." });
      load();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create post.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Posts</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The latest discussions, updates, and announcements from the network
            {authUser?.fullName ? `, ${authUser.fullName}` : ""}.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" /> Create Post
        </Button>
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            message.type === "success"
              ? "bg-success/15 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Newspaper className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <select
          value={postType}
          onChange={(e) => setPostType(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="all">All types</option>
          {POST_TYPES.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground shadow-card">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading posts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <Newspaper className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No posts found</p>
          <p className="text-sm text-muted-foreground">Try a different search term or post type.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div
              key={p._id || p.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {p.title || "Untitled post"}
                </h2>
                {p.postType && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium capitalize text-success">
                    {p.postType}
                  </span>
                )}
              </div>
              {p.content && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{p.content}</p>
              )}
              {p.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  {p.likeCount ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {p.commentCount ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>Share an update with the network.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Give your post a title"
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Content</label>
              <textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="What do you want to share?"
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
              <select
                value={form.postType}
                onChange={(e) => setForm((f) => ({ ...f, postType: e.target.value }))}
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              >
                {POST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tags</label>
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="comma,separated,tags"
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Post
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
