import { useEffect, useMemo, useState } from "react";
import { Handshake, Loader2, Search } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getCollaborationRequests } from "../services/collaborations";

const STATUSES = ["pending", "accepted", "rejected", "withdrawn"];

export default function ConnectionsPage() {
  const { user: authUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getCollaborationRequests();
        if (!active) return;
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load collaboration requests.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesStatus = status === "all" || r.status === status;
      const matchesQuery =
        !q ||
        r.subject?.toLowerCase().includes(q) ||
        r.message?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [requests, query, status]);

  const statusBadge = (s) => {
    const map = {
      pending: "bg-success/15 text-success",
      accepted: "bg-success/15 text-success",
      rejected: "bg-destructive/10 text-destructive",
      withdrawn: "bg-muted text-muted-foreground",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Connections</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Collaboration requests across the network
          {authUser?.fullName ? `, ${authUser.fullName}` : ""}.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests…"
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
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
          <Loader2 className="h-4 w-4 animate-spin" /> Loading connections…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <Handshake className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No collaboration requests found</p>
          <p className="text-sm text-muted-foreground">Try a different search term or status.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div
              key={r._id || r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Handshake className="h-4 w-4 text-primary" />
                  {r.subject || "Collaboration request"}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(r.status)}`}
                >
                  {r.status || "pending"}
                </span>
              </div>
              {r.type && (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {r.type}
                </p>
              )}
              {r.message && (
                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{r.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
