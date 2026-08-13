import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const TopNav = () => {
  const { currentUser } = useAuth();
  const { setIsCommandPaletteOpen } = useApp();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
        {/* Quick Search Button (Ctrl + K trigger) */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-3 bg-slate-50/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 px-3.5 py-2.5 rounded-xl text-xs font-medium w-full max-w-sm transition-all border border-slate-200/80 min-h-[44px]"
        >
          <Search className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          <span className="flex-1 text-left">Search startups, founders, investors...</span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-500 rounded border border-slate-200 shadow-xs">
            Ctrl K
          </kbd>
        </button>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Add Startup Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/app/startups/create')}
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Add Startup</span>
          </Button>

          {/* Notification Center Dropdown */}
          <NotificationDropdown />

          {/* User Profile Avatar */}
          <div
            onClick={() => navigate('/app/profile')}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Avatar src={currentUser?.avatar} alt={currentUser?.name} size="sm" isVerified={currentUser?.isVerified || false} />
          </div>
        </div>
      </div>
    </header>
  );
};
