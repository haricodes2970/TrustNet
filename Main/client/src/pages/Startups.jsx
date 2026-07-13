import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Rocket, Search } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getStartups } from "../services/startups";

const STAGES = ["idea", "validation", "early-stage", "growth", "established"];

export default function StartupsPage() {
  const { user: authUser } = useAuth();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getStartups();
        if (!active) return;
        setStartups(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load startups.");
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
    return startups.filter((s) => {
      const matchesStage = stage === "all" || s.stage === stage;
      const matchesQuery =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.tagline?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q);
      return matchesStage && matchesQuery;
    });
  }, [startups, query, stage]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Startups</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Discover startups building on TrustNet
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
            placeholder="Search startups…"
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => (
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
          <Loader2 className="h-4 w-4 animate-spin" /> Loading startups…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <Rocket className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No startups found</p>
          <p className="text-sm text-muted-foreground">Try a different search term or stage.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s._id || s.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Rocket className="h-4 w-4 text-primary" />
                  {s.name}
                </h2>
                {s.stage && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium capitalize text-success">
                    {s.stage}
                  </span>
                )}
              </div>
              {s.tagline && (
                <p className="mt-1 text-sm font-medium text-foreground/80">{s.tagline}</p>
              )}
              {s.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {s.category && <span className="capitalize">{s.category}</span>}
                {s.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {s.location}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
