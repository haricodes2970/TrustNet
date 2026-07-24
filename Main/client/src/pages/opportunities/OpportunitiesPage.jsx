import React, { useState } from 'react';
import { Briefcase, Search, Plus } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { useApp } from '../../context/AppContext';

export const OpportunitiesPage = () => {
  const { opportunities } = useApp();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const types = ['All', 'Startup Job', 'Co-Founder Search', 'Accelerator Program'];

  const filtered = opportunities.filter(o => {
    const matchesSearch = o.title.toLowerCase().includes(search.toLowerCase()) || o.organization.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'All' || o.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Opportunity Marketplace</h1>
          <p className="text-xs text-slate-500 mt-1">Discover startup roles, technical co-founder openings, and YC cohorts</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-soft-sm">
        <div className="flex-1 w-full">
          <Input
            icon={Search}
            placeholder="Search roles, skills, startups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                selectedType === t
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(opp => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
};
