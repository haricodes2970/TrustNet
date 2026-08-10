import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Plus,
  Search,
  Grid,
  List,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
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

  const stages = [{ value: 'All', label: 'All Stages' }, ...STAGE_OPTIONS];

  const filteredStartups = myStartups.filter(s => {
    const nameMatch = s.name ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const taglineMatch = s.tagline ? s.tagline.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const descriptionMatch = s.description ? s.description.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    
    const matchesSearch = nameMatch || taglineMatch || descriptionMatch;
    const matchesStage = selectedStage === 'All' || s.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="bg-[#F7F5EF] text-[#0E1A2B] font-sans p-6 sm:p-8 min-h-screen -m-6 sm:-m-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#0E1A2B] tracking-tight">
              My Startups
            </h1>
            <span className="font-mono text-xs bg-[#0F6E5C]/10 text-[#0F6E5C] border border-[#0F6E5C]/20 px-2 py-0.5 rounded-[4px] font-bold">
              {myStartups.length} Active
            </span>
          </div>
          <p className="text-xs text-[#5B6472] mt-1 font-sans">
            Manage operations, team rosters, milestones, and workspace components for your ventures.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0 shadow-[0_2px_8px_rgba(14,26,43,0.08)] active:bg-[#0F6E5C]/80"
          onClick={() => navigate('/app/startups/create')}
        >
          <Plus className="w-4 h-4" />
          <span>New Startup</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-1">
          <Input
            icon={Search}
            placeholder="Search my startups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 rounded-[4px] border-[#5B6472]/30 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C]"
          />

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-[#F7F5EF] border border-[#5B6472]/30 text-xs rounded-[4px] px-3 py-2 text-[#0E1A2B] h-11 focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30 focus:border-[#0F6E5C]"
          >
            {stages.map((stg) => (
              <option key={stg.value} value={stg.value}>{stg.label}</option>
            ))}
          </select>
        </div>

        {/* Grid / List View Toggle */}
        <div className="flex items-center gap-1 bg-[#F7F5EF] p-1 rounded-[4px] border border-[#5B6472]/20">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[4px] text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-[#0F6E5C] shadow-[0_2px_8px_rgba(14,26,43,0.08)]'
                : 'text-[#5B6472] hover:text-[#0E1A2B]'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[4px] text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-[#0F6E5C] shadow-[0_2px_8px_rgba(14,26,43,0.08)]'
                : 'text-[#5B6472] hover:text-[#0E1A2B]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <p className="text-sm font-mono text-[#5B6472] animate-pulse">Loading startups...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-[#B23A32]/10 border border-[#B23A32]/20 rounded-[4px] text-[#B23A32] text-sm font-mono">
          Error: {error}
        </div>
      )}

      {!isLoading && !error && filteredStartups.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-[8px] border border-dashed border-[#5B6472]/30 shadow-[0_2px_8px_rgba(14,26,43,0.08)]">
          <div className="w-14 h-14 rounded-[4px] bg-[#0F6E5C]/10 text-[#0F6E5C] flex items-center justify-center mb-4">
            <Rocket className="w-7 h-7" />
          </div>
          <h3 className="text-base font-display font-black text-[#0E1A2B] mb-1">No Startups Found</h3>
          <p className="text-xs text-[#5B6472] max-w-sm leading-relaxed mb-5">
            You haven't added any startups matching these filters yet.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
            onClick={() => navigate('/app/startups/create')}
          >
            Create Your First Startup
          </Button>
        </div>
      )}

      {/* Startups Grid or List View */}
      {!isLoading && filteredStartups.length > 0 && (viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStartups.map((startup) => (
            <div
              key={startup.id}
              className="bg-white rounded-[8px] border border-[#5B6472]/20 overflow-hidden shadow-[0_2px_8px_rgba(14,26,43,0.08)] hover:shadow-[0_4px_12px_rgba(14,26,43,0.12)] transition-shadow group flex flex-col justify-between"
            >
              {/* Top Section */}
              <div>
                {/* Banner - neutral light gray, no gradients */}
                <div className="h-24 w-full bg-[#5B6472]/10 relative flex items-center justify-center p-4">
                  {startup.logo ? (
                    <img src={startup.logo} alt={startup.name} className="w-16 h-16 object-contain rounded-[4px] border border-[#5B6472]/20 bg-white" />
                  ) : (
                    <div className="w-16 h-16 rounded-[4px] border border-[#5B6472]/20 bg-white flex items-center justify-center">
                      <span className="text-[#0F6E5C] font-display font-black text-xl">{startup.name?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-mono font-bold bg-white border border-[#5B6472]/20 px-2 py-0.5 rounded-[4px] text-[#0E1A2B]">
                      {startup.stageLabel}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-display font-black text-[#0E1A2B] group-hover:text-[#0F6E5C] transition-colors line-clamp-1">
                      {startup.name}
                    </h3>
                    <p className="text-xs text-[#5B6472] line-clamp-2 mt-1 min-h-[32px] leading-relaxed">
                      {startup.tagline || startup.description}
                    </p>
                  </div>

                  {/* Ledger Stamp for Status */}
                  <div className="pt-2">
                    <LedgerStamp status={startup.status} date={startup.createdAt} />
                  </div>

                  {/* Financial figures in IBM Plex Mono */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-[#5B6472]/10 pt-3 mt-2">
                    <div>
                      <span className="text-[#5B6472] text-[10px] block uppercase">Funding Goal</span>
                      <strong className="text-[#0E1A2B]">
                        {startup.fundingTarget ? `$${startup.fundingTarget.toLocaleString()}` : '—'}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[#5B6472] text-[10px] block uppercase">Raised</span>
                      <strong className="text-[#0E1A2B]">
                        ${startup.fundingRaised.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="p-4 bg-[#F7F5EF]/40 border-t border-[#5B6472]/10 grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                  onClick={() => navigate(`/app/startups/${startup.id}/manage`)}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Manage</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border border-[#5B6472]/30 hover:border-[#0F6E5C] text-[#0E1A2B] hover:text-[#0F6E5C] hover:bg-white rounded-[4px] bg-transparent"
                  onClick={() => navigate(`/app/startups/${startup.id}`)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#5B6472]/20 rounded-[8px] divide-y divide-[#5B6472]/10 shadow-[0_2px_8px_rgba(14,26,43,0.08)]">
          {filteredStartups.map((startup) => (
            <div key={startup.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F7F5EF]/30 transition-colors">
              <div className="flex items-center gap-4">
                {startup.logo ? (
                  <img src={startup.logo} alt={startup.name} className="w-12 h-12 rounded-[4px] object-contain border border-[#5B6472]/20 bg-white" />
                ) : (
                  <div className="w-12 h-12 rounded-[4px] border border-[#5B6472]/20 bg-white flex items-center justify-center">
                    <span className="text-[#0F6E5C] font-display font-black">{startup.name?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-display font-black text-[#0E1A2B]">{startup.name}</h3>
                  <p className="text-xs text-[#5B6472] line-clamp-1">{startup.tagline || startup.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <span className="text-[10px] font-mono font-bold bg-[#F7F5EF] border border-[#5B6472]/20 px-2 py-0.5 rounded-[4px] text-[#0E1A2B]">
                  {startup.stageLabel}
                </span>
                <LedgerStamp status={startup.status} date={startup.createdAt} />
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                    onClick={() => navigate(`/app/startups/${startup.id}/manage`)}
                  >
                    <span>Manage</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border border-[#5B6472]/30 hover:border-[#0F6E5C] text-[#0E1A2B] hover:text-[#0F6E5C] hover:bg-white rounded-[4px]"
                    onClick={() => navigate(`/app/startups/${startup.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
