import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Rss, 
  Rocket, 
  Users, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  Bell, 
  ShieldCheck, 
  BarChart3, 
  Folder, 
  Bookmark, 
  UserCheck, 
  Activity, 
  Settings, 
  ShieldAlert,
  Compass,
  Palette,
  LogOut,
  PiggyBank
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Logo } from './Logo';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const { notifications } = useApp();
  const navigate = useNavigate();

  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrator';

  const mainNavItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Startup Discovery', path: '/app/discover', icon: Compass },
    { label: 'My Startups', path: '/app/startups', icon: Rocket },
    { label: 'Funding Marketplace', path: '/app/funding-marketplace', icon: PiggyBank },
    { label: 'Calendar', path: '/app/calendar', icon: Calendar },
    { label: 'Social Feed', path: '/app/feed', icon: Rss },
    { label: 'Explore People', path: '/app/people', icon: Users },
    { label: 'Communities', path: '/app/communities', icon: Users },
    { label: 'Opportunities', path: '/app/opportunities', icon: Briefcase },
    { label: 'Events', path: '/app/events', icon: Calendar },
    { label: 'Messages', path: '/app/messages', icon: MessageSquare, badge: 1 },
    { label: 'Notifications', path: '/app/notifications', icon: Bell, badge: unreadNotifs },
  ];

  const secondaryNavItems = [
    { label: 'Connections', path: '/app/connections', icon: UserCheck },
    { label: 'Saved Content', path: '/app/saved', icon: Bookmark },
    { label: 'Design System', path: '/app/design-system', icon: Palette },
    { label: 'Workspace', path: '/app/workspace', icon: Folder },
    { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
    { label: 'File Manager', path: '/app/files', icon: Folder },
    { label: 'Activity Center', path: '/app/activity', icon: Activity },
    { label: 'Verification', path: '/verification', icon: ShieldCheck },
    ...(isAdmin ? [{ label: 'Admin Panel', path: '/app/admin', icon: ShieldAlert }] : []),
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none overflow-y-auto no-scrollbar">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100">
          <Logo size="md" to="/app/dashboard" />
        </div>

        {/* Primary Navigation Menu */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Main Workspace
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-bold border-l-4 border-emerald-500 shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>

        {/* Secondary Modules */}
        <div className="px-3 py-2 space-y-1 border-t border-slate-100">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Modules & Tools
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-bold border-l-4 border-emerald-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* User Footer Profile Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div
          onClick={() => navigate('/app/profile')}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-white cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar src={currentUser?.avatar} alt={currentUser?.name} size="sm" isVerified={currentUser?.isVerified || false} />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                {currentUser?.name}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.role}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
              navigate('/login');
            }}
            title="Log Out"
            className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
};
