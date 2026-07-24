import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Rocket } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StartupCard } from '../../components/cards/StartupCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useApp } from '../../context/AppContext';
import { STAGE_OPTIONS } from '../../lib/adapters/startupAdapter';

export const StartupsPage = () => {
  const { startups, startupsLoading, startupsError } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('All');

  const stages = [{ value: 'All', label: 'All' }, ...STAGE_OPTIONS];

  const filteredStartups = startups.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.industry || '').toLowerCase().includes(search.toLowerCase());
    const matchesStage = selectedStage === 'All' || s.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Explore Startups</h1>
          <p className="text-xs text-slate-500 mt-1">Discover pre-vetted startups raising seed funding</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/app/startups/create')}>
          <Plus className="w-4 h-4" />
          <span>Publish Startup</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-soft-sm">
        <div className="flex-1 w-full">
          <Input
            icon={Search}
            placeholder="Search by startup name, industry, tech stack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {stages.map((stg) => (
            <button
              key={stg.value}
              onClick={() => setSelectedStage(stg.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                selectedStage === stg.value
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {stg.label}
            </button>
          ))}
        </div>
      </div>

      {startupsLoading && <p className="text-sm text-slate-500">Loading startups…</p>}
      {startupsError && <p className="text-sm text-red-600">{startupsError}</p>}

      {/* Startup Grid */}
      {!startupsLoading && filteredStartups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStartups.map((s) => (
            <StartupCard key={s.id} startup={s} />
          ))}
        </div>
      ) : !startupsLoading && (
        <EmptyState
          icon={Rocket}
          title="No Startups Found"
          description={`No startups matched your search query "${search}".`}
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setSelectedStage('All');
          }}
        />
      )}
    </div>
  );
};
