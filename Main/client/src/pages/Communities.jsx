import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getCommunities } from "../services/communities";

const CATEGORIES = ["startup", "investor", "mentor", "general", "industry", "innovation"];

export default function CommunitiesPage() {
  const { user: authUser } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getCommunities();
        if (!active) return;
        setCommunities(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load communities.");
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
    return communities.filter((c) => {
      const matchesCategory = category === "all" || c.category === category;
      const matchesQuery =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        (c.tags || []).some((t) => t?.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [communities, query, category]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Communities</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Discover and join communities across the network
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
            placeholder="Search communities…"
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
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
          <Loader2 className="h-4 w-4 animate-spin" /> Loading communities…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <Users className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No communities found</p>
          <p className="text-sm text-muted-foreground">Try a different search term or category.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c._id || c.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">{c.name}</h2>
                {c.category && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    {c.category}
                  </span>
                )}
              </div>
              {c.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{c.memberCount ?? (c.members ? c.members.length : 0)} members</span>
                {c.type && <span className="ml-auto capitalize">{c.type}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
