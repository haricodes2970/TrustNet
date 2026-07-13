import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, User as UserIcon, Rocket, UsersRound, Newspaper } from "lucide-react";
import { useGlobalSearch } from "../../services/search";
import { cn } from "../../lib/utils";

const GROUPS = [
  { key: "users", label: "People", icon: UserIcon },
  { key: "startups", label: "Startups", icon: Rocket },
  { key: "communities", label: "Communities", icon: UsersRound },
  { key: "posts", label: "Posts", icon: Newspaper },
];

function resultTitle(group, item) {
  switch (group) {
    case "users":
      return item.fullName;
    case "startups":
      return item.name;
    case "communities":
      return item.name;
    case "posts":
      return item.title || item.content?.slice(0, 60) || "Untitled post";
    default:
      return "";
  }
}

function resultSubtitle(group, item) {
  switch (group) {
    case "users":
      return `@${item.username}`;
    case "startups":
      return item.tagline || item.category || "";
    case "communities":
      return `${item.memberCount || 0} members`;
    case "posts":
      return item.postType || "";
    default:
      return "";
  }
}

function resultPath(group, item) {
  switch (group) {
    case "users":
      return "/dashboard/profile";
    case "startups":
      return "/dashboard/startups";
    case "communities":
      return "/dashboard/communities";
    case "posts":
      return "/dashboard/posts";
    default:
      return "/dashboard";
  }
}

export function GlobalSearch() {
  const { query, setQuery, results, loading } = useGlobalSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const trimmed = query.trim();
  const hasResults = GROUPS.some((g) => (results[g.key] || []).length > 0);

  useEffect(() => {
    function onClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSelect(group, item) {
    setOpen(false);
    setQuery("");
    navigate(resultPath(group, item));
  }

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 sm:block">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (trimmed) setOpen(true);
        }}
        placeholder="Search users, startups, investors, communities…"
        className="w-full rounded-xl border border-border bg-input py-2 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
        aria-label="Global search"
      />

      {open && trimmed && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{trimmed}&rdquo;
            </div>
          )}

          {!loading && hasResults && (
            <div className="max-h-[70vh] overflow-y-auto py-1">
              {GROUPS.map((group) => {
                const items = results[group.key] || [];
                if (!items.length) return null;
                const Icon = group.icon;
                return (
                  <div key={group.key} className="px-2 py-1">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                    {items.map((item) => (
                      <button
                        key={item._id}
                        onClick={() => handleSelect(group.key, item)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">
                            {resultTitle(group.key, item)}
                          </span>
                          {resultSubtitle(group.key, item) && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {resultSubtitle(group.key, item)}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
