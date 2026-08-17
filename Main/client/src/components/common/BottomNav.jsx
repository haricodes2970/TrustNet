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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-trust-paper border-t border-trust-ink/10 px-2 py-2 flex items-center justify-around">
      {mobileTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded text-[10px] font-bold transition-colors focus-ring ${
                isActive ? 'text-trust-verified' : 'text-trust-slate hover:text-trust-ink'
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
