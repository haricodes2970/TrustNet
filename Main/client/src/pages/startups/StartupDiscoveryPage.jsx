import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  TrendingUp, 
  Flame, 
  ShieldCheck, 
  Search, 
  Bookmark, 
  Share2, 
  ExternalLink, 
  Compass,
  Building,
  DollarSign
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { StartupCard } from '../../components/cards/StartupCard';
import { useApp } from '../../context/AppContext';

export const StartupDiscoveryPage = () => {
  const navigate = useNavigate();
  const { startups, showToast } = useApp();
  const [activeCategory, setActiveCategory] = useState('Featured');

  const categories = [
    { id: 'Featured', label: 'Featured Pitch Decks', icon: Sparkles },
    { id: 'Trending', label: 'Trending This Week', icon: Flame },
    { id: 'RecentlyFunded', label: 'Recently Funded', icon: DollarSign },
    { id: 'Verified', label: 'YC & Verified Founders', icon: ShieldCheck }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Header Banner */}
      <Card className="p-8 sm:p-10 border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <Badge variant="emerald" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Startup Discovery Engine
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Discover Top 1% Pre-Seed & Seed Pitch Opportunities
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            Explore verified AI, SaaS, Fintech, and Climate startups raising active rounds on TrustNet.
          </p>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={() => navigate('/app/startups/create')}>
              <span>Publish Your Startup</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-w-max ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-soft-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Startup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {startups.map((s) => (
          <StartupCard key={s.id} startup={s} />
        ))}
      </div>
    </div>
  );
};
