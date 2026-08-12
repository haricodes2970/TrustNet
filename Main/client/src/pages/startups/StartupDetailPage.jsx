import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  FileText,
  Share2,
  ArrowLeft,
  Globe,
  DollarSign,
  User,
  Tags,
  Building
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { useApp } from '../../context/AppContext';
import * as startupApi from '../../lib/startupApi';
import { normalizeStartup } from '../../lib/adapters/startupAdapter';

export const StartupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [startup, setStartup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const raw = await startupApi.getStartup(id);
        if (!cancelled) setStartup(normalizeStartup(raw));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link Copied', 'Startup page URL copied to clipboard.', 'success');
  };

  if (isLoading) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex items-center justify-center">
        <p className="text-sm font-mono text-[#5B6472] animate-pulse">Loading startup details...</p>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex flex-col items-center justify-center space-y-4">
        <p className="text-sm font-mono text-[#B23A32]">Error: {error || 'Startup profile not found.'}</p>
        <Button
          variant="outline"
          size="sm"
          className="border border-[#5B6472]/30 text-[#0E1A2B] rounded-[4px]"
          onClick={() => navigate('/app/startups')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Startups</span>
        </Button>
      </div>
    );
  }

  const progressPercent = startup.fundingTarget
    ? Math.min(100, Math.round((startup.fundingRaised / startup.fundingTarget) * 100))
    : 0;

  return (
    <div className="bg-[#F7F5EF] text-[#0E1A2B] font-sans p-6 sm:p-8 min-h-screen -m-6 sm:-m-8 space-y-6">
      {/* Breadcrumbs & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#5B6472]/10 pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-[#5B6472]">
          <Link to="/app/startups" className="hover:text-[#0E1A2B] transition-colors">Startups</Link>
          <span>/</span>
          <span className="text-[#0E1A2B] font-bold">{startup.name}</span>
          <span>/</span>
          <span className="text-[#0F6E5C] font-bold">Overview</span>
        </div>

        <button
          onClick={() => navigate('/app/startups')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6472] hover:text-[#0E1A2B] transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Startups</span>
        </button>
      </div>

      {/* Contextual Navigation (Startup Context) */}
      <div className="flex border-b border-[#5B6472]/20">
        <Link
          to={`/app/startups/${startup.id}`}
          className="px-4 py-2 text-xs font-bold border-b-2 border-[#0F6E5C] text-[#0F6E5C] font-sans tracking-wide uppercase"
        >
          Overview
        </Link>
        <Link
          to={`/app/startups/${startup.id}/team`}
          className="px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-[#5B6472] hover:text-[#0E1A2B] font-sans tracking-wide uppercase transition-colors"
        >
          Team
        </Link>
        <Link
          to={`/app/workspaces/${startup.id}`}
          className="px-4 py-2 text-xs font-semibold border-b-2 border-transparent text-[#5B6472] hover:text-[#0E1A2B] font-sans tracking-wide uppercase transition-colors"
        >
          Workspace
        </Link>
      </div>

      {/* Header Showcase Info */}
      <Card className="bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] overflow-hidden">
        {/* Banner with neutral fallback background, no gradients */}
        <div className="h-44 sm:h-56 w-full bg-[#5B6472]/10 relative">
          <div className="absolute top-4 right-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-white border border-[#5B6472]/30 hover:bg-[#F7F5EF] text-[#0E1A2B] rounded-[4px]"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        <div className="p-6 sm:p-8 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-12 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {startup.logo ? (
                <img src={startup.logo} alt={startup.name} className="w-20 h-20 rounded-[4px] object-contain border border-[#5B6472]/20 bg-white shadow-[0_2px_8px_rgba(14,26,43,0.08)]" />
              ) : (
                <div className="w-20 h-20 rounded-[4px] border border-[#5B6472]/20 bg-white flex items-center justify-center text-3xl font-display font-black text-[#0F6E5C] shadow-[0_2px_8px_rgba(14,26,43,0.08)]">
                  {startup.name?.charAt(0)}
                </div>
              )}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-display font-black text-[#0E1A2B] tracking-tight">{startup.name}</h1>
                <p className="text-xs text-[#5B6472] flex items-center gap-2 font-sans">
                  <MapPin className="w-3.5 h-3.5" />
                  {startup.location || 'Location not specified'}
                  {startup.foundedYear && ` • Founded ${startup.foundedYear}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {startup.pitchDeckUrl && (
                <Button
                  variant="primary"
                  size="md"
                  className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0 shadow-[0_2px_8px_rgba(14,26,43,0.08)]"
                  onClick={() => window.open(startup.pitchDeckUrl, '_blank', 'noopener')}
                >
                  <FileText className="w-4 h-4" />
                  <span>View Pitch Deck</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="md"
                className="border border-[#5B6472]/30 text-[#0E1A2B] hover:bg-[#F7F5EF] rounded-[4px]"
                onClick={() => navigate(`/app/startups/${startup.id}/manage`)}
              >
                <span>Manage Workspace</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-[10px] font-mono font-bold bg-[#F7F5EF] border border-[#5B6472]/20 px-2.5 py-1 rounded-[4px] text-[#0E1A2B] uppercase">
              {startup.stageLabel}
            </span>
            {startup.industry && (
              <span className="text-[10px] font-mono font-bold bg-[#F7F5EF] border border-[#5B6472]/20 px-2.5 py-1 rounded-[4px] text-[#5B6472] uppercase">
                {startup.industry}
              </span>
            )}
            <LedgerStamp status={startup.status} date={startup.createdAt} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#5B6472] uppercase tracking-wider">Company Description</h3>
            <p className="text-sm text-[#0E1A2B] leading-relaxed max-w-4xl font-sans">
              {startup.description}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Funding Progress (if set) */}
          <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)]">
            <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider mb-4">Funding Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end text-xs font-mono">
                <div>
                  <span className="text-[#5B6472] uppercase block text-[10px]">Total Raised</span>
                  <strong className="text-lg text-[#0F6E5C] font-bold">${startup.fundingRaised.toLocaleString()}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[#5B6472] uppercase block text-[10px]">Funding Goal</span>
                  <strong className="text-lg text-[#0E1A2B] font-bold">
                    {startup.fundingTarget ? `$${startup.fundingTarget.toLocaleString()}` : '—'}
                  </strong>
                </div>
              </div>

              {startup.fundingTarget > 0 && (
                <div className="space-y-1">
                  <div className="h-3 w-full bg-[#F7F5EF] border border-[#5B6472]/20 rounded-[4px] overflow-hidden">
                    <div
                      className="h-full bg-[#0F6E5C] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#5B6472] block text-right">
                    {progressPercent}% of Goal Achieved
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Problem & Solution */}
          {(startup.problemStatement || startup.solution || startup.targetMarket) && (
            <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-6">
              <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider">Strategic Overview</h3>
              
              {startup.problemStatement && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#5B6472] uppercase tracking-wider block">The Problem</span>
                  <p className="text-sm text-[#0E1A2B] leading-relaxed font-sans">{startup.problemStatement}</p>
                </div>
              )}

              {startup.solution && (
                <div className="space-y-1.5 border-t border-[#5B6472]/10 pt-4">
                  <span className="text-xs font-semibold text-[#5B6472] uppercase tracking-wider block">The Solution</span>
                  <p className="text-sm text-[#0E1A2B] leading-relaxed font-sans">{startup.solution}</p>
                </div>
              )}

              {startup.targetMarket && (
                <div className="space-y-1.5 border-t border-[#5B6472]/10 pt-4">
                  <span className="text-xs font-semibold text-[#5B6472] uppercase tracking-wider block">Target Market</span>
                  <p className="text-sm text-[#0E1A2B] leading-relaxed font-sans">{startup.targetMarket}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Sidebar Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata/Founder Card */}
          <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
            <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider border-b border-[#5B6472]/10 pb-2">
              Metadata
            </h3>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5B6472] flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Founder ID</span>
                <span className="text-[#0E1A2B] font-bold break-all select-all">{startup.founderId || 'Unknown'}</span>
              </div>

              {startup.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[#5B6472] flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Registered</span>
                  <span className="text-[#0E1A2B]">
                    {new Date(startup.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Tags */}
          {startup.tags?.length > 0 && (
            <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-3">
              <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider flex items-center gap-1.5">
                <Tags className="w-4 h-4 text-[#5B6472]" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {startup.tags.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-[11px] font-mono bg-[#F7F5EF] border border-[#5B6472]/20 text-[#5B6472] rounded-[4px]">
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Website Link */}
          {startup.website && (
            <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-3">
              <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider">
                Venture Website
              </h3>
              <a
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#0F6E5C] font-semibold hover:underline break-all"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>{startup.website}</span>
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
