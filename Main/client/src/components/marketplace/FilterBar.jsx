import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Bookmark, Send, UserCircle } from 'lucide-react';

export const FilterBar = ({ selected, onSelect, categories = ['All', 'Legal', 'Design', 'Development', 'Marketing', 'Tools'] }) => (
  <div className="flex flex-wrap gap-1.5">
    {categories.map((cat) => {
      const isActive = selected === cat;
      return (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all ${
            isActive
              ? 'bg-trust-verified text-white border-trust-verified shadow-soft-sm'
              : 'text-trust-slate bg-white border-slate-200 hover:bg-trust-verified/5 hover:border-trust-verified/30'
          }`}
        >
          {cat}
        </button>
      );
    })}
  </div>
);
