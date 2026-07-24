import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Rss, Rocket, MessageSquare, Bell, User } from 'lucide-react';

export const BottomNav = () => {
  const mobileTabs = [
    { label: 'Feed', path: '/app/feed', icon: Rss },
    { label: 'Startups', path: '/app/startups', icon: Rocket },
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Chat', path: '/app/messages', icon: MessageSquare },
    { label: 'Profile', path: '/app/profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around">
      {mobileTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold transition-colors ${
                isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
