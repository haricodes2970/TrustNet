import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building, 
  Users, 
  Settings, 
  ExternalLink, 
  Share2, 
  ArrowLeft,
  DollarSign,
  Folder,
  Briefcase,
  Bot,
  FileText
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { useApp } from '../../context/AppContext';
import * as startupApi from '../../lib/startupApi';
import { normalizeStartup } from '../../lib/adapters/startupAdapter';

export const StartupManagementDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [startup, setStartup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

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
    navigator.clipboard.writeText(`${window.location.origin}/app/startups/${startup.id}`);
    showToast('Link Copied', 'Public pitch page link copied.', 'success');
  };

  if (isLoading) {
    return (
      <div className="bg-[#F7F5EF] min-h-screen -m-6 sm:-m-8 p-6 sm:p-8 flex items-center justify-center">
        <p className="text-sm font-mono text-[#5B6472] animate-pulse">Loading management dashboard...</p>
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
          <Link to={`/app/startups/${startup.id}`} className="hover:text-[#0E1A2B] transition-colors">{startup.name}</Link>
          <span>/</span>
          <span className="text-[#0F6E5C] font-bold">Manage Dashboard</span>
        </div>

        <button
          onClick={() => navigate('/app/startups')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B6472] hover:text-[#0E1A2B] transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Startups</span>
        </button>
      </div>

      {/* Header Showcase Banner */}
      <Card className="bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] overflow-hidden">
        <div className="h-32 sm:h-40 w-full bg-[#5B6472]/10 relative"></div>
        <div className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-10 mb-4">
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
                <p className="text-xs text-[#5B6472] font-sans">{startup.tagline || 'Manage your venture execution details'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="border border-[#5B6472]/30 text-[#0E1A2B] hover:bg-[#F7F5EF] rounded-[4px]"
                onClick={() => navigate(`/app/startups/${startup.id}`)}
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                <span>Public View</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#0F6E5C] hover:bg-[#0F6E5C]/90 text-white rounded-[4px] border-0"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                <span>Share Pitch</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Contextual Navigation Tabs */}
      <div className="flex border-b border-[#5B6472]/20">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold border-b-2 tracking-wide uppercase transition-all ${
            activeTab === 'overview' ? 'border-[#0F6E5C] text-[#0F6E5C]' : 'border-transparent text-[#5B6472] hover:text-[#0E1A2B]'
          }`}
        >
          Overview
        </button>
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

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)]">
              <span className="text-[10px] font-mono text-[#5B6472] uppercase block tracking-wider">Round Target</span>
              <h3 className="text-2xl font-mono font-bold text-[#0E1A2B] mt-1">
                {startup.fundingTarget ? `$${startup.fundingTarget.toLocaleString()}` : '—'}
              </h3>
            </Card>

            <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)]">
              <span className="text-[10px] font-mono text-[#5B6472] uppercase block tracking-wider">Amount Raised</span>
              <h3 className="text-2xl font-mono font-bold text-[#0F6E5C] mt-1">
                ${startup.fundingRaised.toLocaleString()}
              </h3>
            </Card>

            <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#5B6472] uppercase block tracking-wider">Profile Status</span>
                <div className="mt-1">
                  <LedgerStamp status={startup.status} date={startup.createdAt} />
                </div>
              </div>
            </Card>
          </div>

          {/* Details sections */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider border-b border-[#5B6472]/10 pb-2">
                  Venture Profile Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#5B6472] block text-[10px] uppercase">Category</span>
                    <strong className="text-[#0E1A2B] font-bold">{startup.industry || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[#5B6472] block text-[10px] uppercase">Stage</span>
                    <strong className="text-[#0E1A2B] font-bold uppercase">{startup.stageLabel}</strong>
                  </div>
                  <div>
                    <span className="text-[#5B6472] block text-[10px] uppercase">Location</span>
                    <strong className="text-[#0E1A2B] font-bold">{startup.location || 'N/A'}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-mono text-[#5B6472] uppercase block">Detailed Description</span>
                  <p className="text-sm text-[#0E1A2B] leading-relaxed font-sans">{startup.description}</p>
                </div>
              </Card>

              {/* FounderVerse Features marked as Future Ideas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <FileText className="w-5 h-5 text-[#5B6472]" />
                    <span className="text-[9px] font-mono font-bold bg-[#C8862B]/10 text-[#C8862B] px-1.5 py-0.5 rounded-[4px]">FUTURE IDEA</span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#0E1A2B]">Document Vault</h4>
                  <p className="text-[10px] text-[#5B6472] leading-relaxed">Secure document uploads & pitch deck version auditing.</p>
                </Card>

                <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <Briefcase className="w-5 h-5 text-[#5B6472]" />
                    <span className="text-[9px] font-mono font-bold bg-[#C8862B]/10 text-[#C8862B] px-1.5 py-0.5 rounded-[4px]">FUTURE IDEA</span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#0E1A2B]">Hiring Board</h4>
                  <p className="text-[10px] text-[#5B6472] leading-relaxed">Manage team job postings and review incoming applicants.</p>
                </Card>

                <Card className="p-5 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <Bot className="w-5 h-5 text-[#5B6472]" />
                    <span className="text-[9px] font-mono font-bold bg-[#C8862B]/10 text-[#C8862B] px-1.5 py-0.5 rounded-[4px]">BACKEND GAP</span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#0E1A2B]">AI Advisor</h4>
                  <p className="text-[10px] text-[#5B6472] leading-relaxed">Automated pitch deck reviews and real-time funding insight tips.</p>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 bg-white rounded-[8px] border border-[#5B6472]/20 shadow-[0_2px_8px_rgba(14,26,43,0.08)] space-y-4">
                <h3 className="text-sm font-semibold text-[#0E1A2B] uppercase tracking-wider border-b border-[#5B6472]/10 pb-2">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link
                    to={`/app/workspaces/${startup.id}`}
                    className="w-full inline-flex items-center gap-2 p-2.5 text-xs font-semibold border border-[#5B6472]/30 hover:border-[#0F6E5C] text-[#0E1A2B] hover:text-[#0F6E5C] rounded-[4px] hover:bg-[#F7F5EF]/30 transition-colors"
                  >
                    <Folder className="w-4 h-4 text-[#0F6E5C]" />
                    <span>Go to Sprint Workspace</span>
                  </Link>

                  <Link
                    to={`/app/startups/${startup.id}/team`}
                    className="w-full inline-flex items-center gap-2 p-2.5 text-xs font-semibold border border-[#5B6472]/30 hover:border-[#0F6E5C] text-[#0E1A2B] hover:text-[#0F6E5C] rounded-[4px] hover:bg-[#F7F5EF]/30 transition-colors"
                  >
                    <Users className="w-4 h-4 text-[#0F6E5C]" />
                    <span>Manage Roster & Roles</span>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
