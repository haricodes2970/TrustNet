import { Link, NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import {
  Bell,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Newspaper,
  Rocket,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Logo } from "../common/logo";
import { InitialsAvatar } from "../common/badges";
import { GlobalSearch } from "../search/global-search";
import { useAuth } from "../../hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Communities", url: "/dashboard/communities", icon: UsersRound },
  { title: "Startups", url: "/dashboard/startups", icon: Rocket },
  { title: "Posts", url: "/dashboard/posts", icon: Newspaper },
  { title: "Connections", url: "/dashboard/connections", icon: Users },
  { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Verification", url: "/dashboard/verification", icon: ShieldCheck },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

function SidebarNav({ onNavigate, onLogout }) {
  const { user } = useAuth();
  const pathname = useLocation().pathname;
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo light />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const active = pathname === item.url || pathname.startsWith(item.url + "/");
          return (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5 shrink-0", active && "text-sidebar-primary")} />
              <span className="flex-1">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4.5 w-4.5" /> Logout
        </button>
      </div>
    </div>
  );
}

export function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const displayName = user?.fullName || "TrustNet User";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 bg-sidebar lg:block">
        <SidebarNav onLogout={handleLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="animate-scale-in absolute inset-y-0 left-0 w-64 bg-sidebar shadow-elevated">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarNav onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/dashboard/notifications" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring/40">
                <InitialsAvatar name={displayName} src={user?.avatarUrl} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs font-normal text-muted-foreground">@{user?.username || "member"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile">View Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button onClick={handleLogout} className="w-full text-left">Logout</button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex items-center gap-2.5 bg-warning/10 px-4 py-2.5 text-sm sm:px-6">
          <Clock className="h-4 w-4 shrink-0 text-warning" />
          <p className="min-w-0 text-foreground">
            <span className="font-semibold">Pending Verification</span>
            <span className="hidden sm:inline"> — Your documents are currently under review. Estimated completion: 24–48 hours.</span>
          </p>
          <Link to="/dashboard/verification" className="ml-auto shrink-0 text-sm font-semibold text-primary hover:underline">
            View status
          </Link>
        </div>

        <main className="flex-1">
  <Outlet />
</main>
      </div>
    </div>
  );
}
