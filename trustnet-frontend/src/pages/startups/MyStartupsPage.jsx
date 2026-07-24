import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Plus,
  Search,
  Grid,
  List,
  TrendingUp,
  Users,
  DollarSign,
  Share2,
  ExternalLink,
  Settings,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { useApp } from '../../context/AppContext';
import * as startupApi from '../../lib/startupApi';
import { normalizeStartups, STAGE_OPTIONS } from '../../lib/adapters/startupAdapter';

export const MyStartupsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [myStartups, setMyStartups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('All');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await startupApi.getMyStartups();
        if (!cancelled) setMyStartups(normalizeStartups(data));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stages = [{ value: 'All', label: 'All' }, ...STAGE_OPTIONS];

  const filteredStartups = myStartups.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === 'All' || s.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            My Startups
            <Badge variant="emerald">{myStartups.length} Active</Badge>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage operations, investor pipeline, hiring boards, and health scores for your ventures.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => navigate('/app/startups/create')}>
          <Plus className="w-4 h-4" />
          <span>New Startup</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <Input
            icon={Search}
            placeholder="Search my startups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72"
          />

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100"
          >
            {stages.map((stg) => (
              <option key={stg.value} value={stg.value}>{stg.value === 'All' ? 'All Stages' : stg.label}</option>
            ))}
          </select>
        </div>

        {/* Grid / List View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {isLoading && <p className="text-sm text-slate-500">Loading your startups…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isLoading && !error && filteredStartups.length === 0 && (
        <EmptyState
          icon={Rocket}
          title="No Startups Yet"
          description="You haven't published a startup yet."
          actionLabel="Publish Startup"
          onAction={() => navigate('/app/startups/create')}
        />
      )}

      {/* Startups Grid or List View */}
      {!isLoading && filteredStartups.length > 0 && (viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStartups.map((startup) => (
            <Card
              key={startup.id}
              className="overflow-hidden border-slate-200 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 shadow-soft-sm hover:shadow-soft-md group"
            >
              {/* Banner */}
              <div className="h-28 w-full bg-gradient-to-br from-emerald-500/20 to-slate-200 dark:bg-slate-800 relative">
                {startup.banner && <img src={startup.banner} alt={startup.name} className="w-full h-full object-cover" />}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge variant="emerald" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm">
                    {startup.stageLabel}
                  </Badge>
                </div>
              </div>

              <div className="p-5 relative pt-0">
                <div className="flex items-end justify-between -mt-8 mb-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-900 shadow-md bg-white flex items-center justify-center">
                    {startup.logo ? (
                      <img src={startup.logo} alt={startup.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-emerald-600 font-bold">{startup.name?.charAt(0)}</span>
                    )}
                  </div>

                  <Badge variant="slate">{startup.status}</Badge>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors">
                    {startup.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {startup.tagline}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[10px] block">FUNDING GOAL</span>
                      <strong className="font-bold text-slate-900 dark:text-white">
                        {startup.fundingTarget ? `$${(startup.fundingTarget / 1000000).toFixed(1)}M` : '—'}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">RAISED</span>
                      <strong className="font-bold text-slate-900 dark:text-white">
                        ${(startup.fundingRaised / 1000).toFixed(0)}k
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/app/startups/${startup.id}/manage`)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/app/startups/${startup.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Public View</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-slate-800 border-slate-200 dark:border-slate-800">
          {filteredStartups.map((startup) => (
            <div key={startup.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <img src={startup.logo} alt={startup.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{startup.name}</h3>
                  <p className="text-xs text-slate-500">{startup.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs">
                <Badge variant="emerald">{startup.stageLabel}</Badge>
                <Button variant="primary" size="sm" onClick={() => navigate(`/app/startups/${startup.id}/manage`)}>
                  <span>Manage</span>
                </Button>
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
};
