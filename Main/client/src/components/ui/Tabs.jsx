import React from 'react';
import { motion } from 'framer-motion';

export const Tabs = ({
  tabs = [], // [{ id, label, icon: Icon, badge: count }]
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.badge}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
