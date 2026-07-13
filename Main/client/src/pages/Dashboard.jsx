import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../services/dashboard";
import { getRecommendations } from "../services/recommendations";

export default function DashboardPage() {
  const { user: authUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getDashboard();
        if (!active) return;
        setDashboard(data);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getRecommendations();
        if (!active) return;
        setRecommendations(data);
      } catch (err) {
        if (!active) return;
        setRecError(err?.response?.data?.message || "Failed to load recommendations.");
      } finally {
        if (active) setRecLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card text-muted-foreground">
          Loading dashboard…
        </div>
      </div>
    );
  }

  const profile = dashboard?.user ?? {};
  const stats = dashboard?.stats ?? {};
  const recentActivity = dashboard?.recentActivity ?? [];

  const cards = [
    { label: "Startups", value: stats.startups ?? 0 },
    { label: "Communities", value: stats.communities ?? 0 },
    { label: "Collaborations", value: stats.collaborations ?? 0 },
    { label: "Posts", value: stats.posts ?? 0 },
  ];

  const startups = recommendations?.startups ?? [];
  const communities = recommendations?.communities ?? [];
  const users = recommendations?.users ?? [];
  const posts = recommendations?.posts ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back{profile.fullName ? `, ${profile.fullName}` : authUser?.fullName ? `, ${authUser.fullName}` : ""}.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentActivity.map((item) => (
              <li key={item.id} className="py-3">
                <p className="text-sm font-medium text-foreground">
                  {item.title || item.content?.slice(0, 80) || "New post"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.postType}
                  {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Recommended Startups</h2>
          {recLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading recommendations…</p>
          ) : recError ? (
            <p className="mt-2 text-sm font-medium text-destructive">{recError}</p>
          ) : startups.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No startups to recommend yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {startups.map((startup) => (
                <li key={startup._id} className="py-3">
                  <p className="text-sm font-medium text-foreground">{startup.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[startup.category, startup.tagline].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Suggested Communities</h2>
          {recLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading recommendations…</p>
          ) : recError ? (
            <p className="mt-2 text-sm font-medium text-destructive">{recError}</p>
          ) : communities.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No communities to suggest yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {communities.map((community) => (
                <li key={community._id} className="py-3">
                  <p className="text-sm font-medium text-foreground">{community.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {community.category}
                    {typeof community.memberCount === "number"
                      ? ` · ${community.memberCount} members`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Suggested People</h2>
          {recLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading recommendations…</p>
          ) : recError ? (
            <p className="mt-2 text-sm font-medium text-destructive">{recError}</p>
          ) : users.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No people to suggest yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {users.map((person) => (
                <li key={person._id} className="py-3">
                  <p className="text-sm font-medium text-foreground">
                    {person.fullName}
                    {person.username ? (
                      <span className="ml-1 text-xs text-muted-foreground">@{person.username}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[person.role, person.designation].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Trending Posts</h2>
          {recLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading recommendations…</p>
          ) : recError ? (
            <p className="mt-2 text-sm font-medium text-destructive">{recError}</p>
          ) : posts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No trending posts yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {posts.map((post) => (
                <li key={post._id} className="py-3">
                  <p className="text-sm font-medium text-foreground">
                    {post.title || post.content?.slice(0, 80) || "New post"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {post.postType}
                    {typeof post.likeCount === "number" ? ` · ${post.likeCount} likes` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
