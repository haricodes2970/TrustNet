import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  User, 
  Rocket, 
  Users, 
  Briefcase, 
  Calendar, 
  Settings, 
  X, 
  DollarSign, 
  Plus,
  Compass,
  Palette,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const CommandPalette = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useApp();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrator';

  const baseNavItems = [
    { label: 'Create New Startup Wizard', path: '/app/startups/create', icon: Plus, category: 'Quick Action' },
    { label: 'My Startups Dashboard', path: '/app/startups/my', icon: Rocket, category: 'Startups' },
    { label: 'Startup Discovery Hub', path: '/app/discover', icon: Compass, category: 'Discovery' },
    { label: 'Calendar & Meeting Scheduler', path: '/app/calendar', icon: Calendar, category: 'Productivity' },
    { label: 'Explore People & Network', path: '/app/people', icon: User, category: 'Network' },
    { label: 'Investor Directory', path: '/app/investors', icon: DollarSign, category: 'Network' },
    { label: 'Communities & Accelerators', path: '/app/communities', icon: Users, category: 'Network' },
    { label: 'Opportunities & Job Board', path: '/app/opportunities', icon: Briefcase, category: 'Marketplace' },
    { label: 'Events & Pitch Days', path: '/app/events', icon: Calendar, category: 'Marketplace' },
    { label: 'Edit Profile & Live Preview', path: '/app/profile/edit', icon: User, category: 'Account' },
    { label: 'Production Design System', path: '/app/design-system', icon: Palette, category: 'System' },
    { label: 'Account & Workspace Settings', path: '/app/settings', icon: Settings, category: 'Account' },
  ];

  const adminNavItems = [
    { label: 'Enterprise Admin Console', path: '/app/admin', icon: ShieldAlert, category: 'Admin' },
    { label: 'Admin User Management Directory', path: '/app/admin?tab=management', icon: Users, category: 'Admin' },
    { label: 'Verification Center Queue', path: '/app/admin?tab=verification', icon: ShieldAlert, category: 'Admin' },
    { label: 'Platform System Health & Logs', path: '/app/admin?tab=settings', icon: Settings, category: 'Admin' },
  ];

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  const filteredItems = navItems.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (!isCommandPaletteOpen) return;

      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex].path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, selectedIndex, filteredItems, setIsCommandPaletteOpen]);

  const handleSelect = (path) => {
    setIsCommandPaletteOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCommandPaletteOpen(false)}
            className="fixed inset-0 bg-trust-ink/50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className="relative w-full max-w-xl bg-trust-paper rounded-lg shadow-soft-sm border border-trust-ink/15 overflow-hidden z-10"
          >
            <div className="flex items-center px-4 border-b border-trust-ink/10 bg-white min-h-[52px]">
              <Search className="w-4 h-4 text-trust-slate mr-3" strokeWidth={1.75} />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search (Ctrl + K)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full py-3 text-sm bg-transparent border-none text-trust-ink focus:outline-none placeholder:text-trust-slate font-medium"
              />
              <button
                onClick={() => setIsCommandPaletteOpen(false)}
                className="p-2 text-trust-slate hover:text-trust-ink rounded focus-ring"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-trust-ink/10">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(item.path)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-trust-verified/10 text-trust-verified font-semibold border-l-4 border-trust-verified'
                          : 'hover:bg-white text-trust-ink'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-trust-verified text-white' : 'bg-white text-trust-slate'
                        }`}>
                          <Icon className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      <span className="text-xs text-trust-slate font-medium">{item.category}</span>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-trust-slate">
                  No commands found matching "{query}"
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-white border-t border-trust-ink/10 text-xs text-trust-slate flex items-center justify-between">
              <span>Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↓</kbd> to navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">ENTER</kbd> to select</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
