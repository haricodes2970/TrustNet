import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building, 
  Users, 
  TrendingUp, 
  FileText, 
  Briefcase, 
  DollarSign, 
  Bot, 
  Settings, 
  Plus, 
  ExternalLink, 
  Share2, 
  CheckCircle2, 
  Download, 
  Eye, 
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowLeft,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { listInvestmentInterests, updateInvestmentInterestStatus } from '../../lib/investmentInterestApi';
import { listFundingRounds } from '../../lib/fundingRoundApi';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

const analyticsData = [
  { month: 'Jan', views: 420, downloads: 45 },
  { month: 'Feb', views: 680, downloads: 82 },
  { month: 'Mar', views: 950, downloads: 140 },
  { month: 'Apr', views: 1420, downloads: 210 },
  { month: 'May', views: 2100, downloads: 340 },
  { month: 'Jun', views: 3450, downloads: 520 }
];

export const StartupManagementDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startups, showToast } = useApp();
  const { currentUser } = useAuth();

  const startup = startups.find(s => s.id === id) || startups[0];
  const [activeTab, setActiveTab] = useState('overview');

  const [teamMembers] = useState([
    { id: '1', name: 'Alex Morgan', role: 'Founder & CEO', dept: 'Executive', access: 'Admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' },
    { id: '2', name: 'Dr. Marcus Vance', role: 'Co-Founder & CTO', dept: 'Engineering', access: 'Admin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400' },
    { id: '3', name: 'Elena Rostova', role: 'Head of AI Research', dept: 'AI Lab', access: 'Editor', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' }
  ]);

  // Live Investment Interest CRM Pipeline State
  const [investorPipeline, setInvestorPipeline] = useState([]);
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [fundingRounds, setFundingRounds] = useState([]);

  const [jobPostings] = useState([
    { id: 'job1', title: 'Senior Frontend Engineer (React + Tailwind)', type: 'Full-time', location: 'San Francisco / Remote', applicants: 34, status: 'Active' },
    { id: 'job2', title: 'AI Research Scientist (LLM Agents)', type: 'Full-time', location: 'San Francisco', applicants: 18, status: 'Active' }
  ]);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const fetchFundingData = async () => {
    setLoadingPipeline(true);
    try {
      const startupIdParam = startup.id;
      const [interestsData, roundsData] = await Promise.all([
        listInvestmentInterests({ startupId: startupIdParam }),
        listFundingRounds({ startupId: startupIdParam })
      ]);
      setInvestorPipeline(Array.isArray(interestsData) ? interestsData : []);
      setFundingRounds(Array.isArray(roundsData) ? roundsData : []);
    } catch (err) {
      console.error('Failed to load investor CRM pipeline:', err);
    } finally {
      setLoadingPipeline(false);
    }
  };

  useEffect(() => {
    fetchFundingData();
  }, [startup.id]);

  const handleUpdateInterestStatus = async (interestId, newStatus) => {
    try {
      await updateInvestmentInterestStatus(interestId, newStatus);
      setInvestorPipeline(prev =>
        prev.map(i => (i._id === interestId || i.id === interestId ? { ...i, status: newStatus } : i))
      );
      showToast('Status Updated', `Investment interest marked as ${newStatus}.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Update Failed', err.message || 'Could not update status.', 'error');
    }
  };

  const handleRunAiAdvisor = (e) => {
    e.preventDefault();
    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
      setAiFeedback(
        `🤖 TrustNet AI Advisor Analysis for ${startup.name}:\n\n1. Pitch Deck Score: 92/100 (Strong market timing, exceptional founder-market fit).\n2. Investor Readiness: Your $${(startup.fundingTarget/1000000).toFixed(1)}M round is priced competitively. Focus outreach on Tier 1 Seed SaaS funds.\n3. Recommended Action: Follow up with active investors with updated MRR growth metrics.`
      );
    }, 1200);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'team', label: 'Team & Roles', icon: Users, badge: teamMembers.length },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'documents', label: 'Document Vault', icon: FileText },
    { id: 'hiring', label: 'Hiring Board', icon: Briefcase, badge: jobPostings.length },
    { id: 'investors', label: 'Investor CRM', icon: DollarSign, badge: investorPipeline.length },
    { id: 'ai-advisor', label: 'AI Advisor', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/startups')} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white flex-shrink-0">
            <img src={startup.logo} alt={startup.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{startup.name}</h1>
              <Badge variant="emerald">Verified Entity</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{startup.tagline || 'Next Generation SaaS Platform'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => showToast('Link Copied', 'Share link copied to clipboard.', 'success')}>
            <Share2 className="w-3.5 h-3.5 mr-1" />
            <span>Share</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/app/startups/${startup.id}`)}>
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            <span>Public Profile</span>
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-slate-200/80 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Seed Target</span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">${(startup.fundingTarget / 1000000).toFixed(2)}M</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">${(startup.fundingRaised / 1000000).toFixed(2)}M raised ({Math.round((startup.fundingRaised / startup.fundingTarget) * 100)}%)</span>
            </Card>

            <Card className="p-5 border-slate-200/80 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Pageviews</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">3,450</h3>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">+64% vs last month</span>
            </Card>

            <Card className="p-5 border-slate-200/80 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data Room Downloads</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">520</h3>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">14 active VCs evaluated</span>
            </Card>

            <Card className="p-5 border-slate-200/80 bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health Readiness Score</span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">94/100</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Tier 1 Investor Ready</span>
            </Card>
          </div>

          {/* Quick Actions & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 border-slate-200/80 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Traffic & Engagement Analytics</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="views" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 border-slate-200/80 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Quick Operations</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => setActiveTab('investors')}>
                  <DollarSign className="w-4 h-4 mr-2 text-emerald-600" />
                  <span>Manage Investor Pipeline ({investorPipeline.length})</span>
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => setActiveTab('hiring')}>
                  <Briefcase className="w-4 h-4 mr-2 text-emerald-600" />
                  <span>View Open Hiring Positions ({jobPostings.length})</span>
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => setActiveTab('ai-advisor')}>
                  <Bot className="w-4 h-4 mr-2 text-emerald-600" />
                  <span>Run AI Startup Advisor</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. TEAM TAB */}
      {activeTab === 'team' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Team Members & Access Control</h3>
            <Button variant="primary" size="sm" onClick={() => showToast('Invite Sent', 'Team invitation email sent.', 'success')}>
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Invite Member</span>
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {teamMembers.map((member) => (
              <div key={member.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{member.name}</h4>
                    <p className="text-xs text-slate-500">{member.role} • {member.dept}</p>
                  </div>
                </div>
                <Badge variant="purple">{member.access}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. INVESTOR CRM PIPELINE */}
      {activeTab === 'investors' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Investor Pipeline CRM</h3>
              <p className="text-xs text-slate-500">Track and manage inbound investment interests and VC proposals.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchFundingData} className="inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh CRM</span>
            </Button>
          </div>

          {loadingPipeline ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : investorPipeline.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <DollarSign className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No Inbound Investment Interests Yet</p>
              <p className="text-xs text-slate-500">Inbound LOIs and pitch requests from investors will populate here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 pt-2">
              {investorPipeline.map((inv) => {
                const idVal = inv._id || inv.id;
                const invName = inv.startupName || inv.investor?.name || inv.name || 'Interested VC';
                const statusStr = inv.status || 'submitted';
                const msg = inv.message || inv.notes || 'Inbound interest proposal.';
                const amount = inv.amount ? `$${inv.amount.toLocaleString()}` : (inv.check || '$100,000');

                return (
                  <div key={idVal} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{invName}</h4>
                        <Badge variant={statusStr === 'accepted' ? 'emerald' : statusStr === 'declined' ? 'red' : 'blue'}>
                          {statusStr}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{msg}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-900 mr-2">{amount}</span>
                      {statusStr === 'submitted' && (
                        <>
                          <Button variant="outline" size="xs" onClick={() => handleUpdateInterestStatus(idVal, 'reviewing')}>
                            Review
                          </Button>
                          <Button variant="primary" size="xs" onClick={() => handleUpdateInterestStatus(idVal, 'accepted')}>
                            Accept
                          </Button>
                        </>
                      )}
                      {statusStr === 'reviewing' && (
                        <Button variant="primary" size="xs" onClick={() => handleUpdateInterestStatus(idVal, 'accepted')}>
                          Accept
                        </Button>
                      )}
                      {statusStr !== 'declined' && statusStr !== 'accepted' && (
                        <Button variant="outline" size="xs" onClick={() => handleUpdateInterestStatus(idVal, 'declined')}>
                          Decline
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 7. AI ADVISOR */}
      {activeTab === 'ai-advisor' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Bot className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Startup Advisor</h3>
              <p className="text-xs text-slate-500">Get AI pitch deck scoring and outreach tips.</p>
            </div>
          </div>

          <form onSubmit={handleRunAiAdvisor} className="space-y-3 pt-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI Advisor e.g. 'Review seed valuation'"
            />
            <Button type="submit" variant="primary" isLoading={isAiGenerating}>
              <Sparkles className="w-4 h-4" strokeWidth={1.75} />
              <span>Run AI Evaluation</span>
            </Button>
          </form>

          {aiFeedback && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
              {aiFeedback}
            </div>
          )}
        </Card>
      )}

      {/* 8. SETTINGS */}
      {activeTab === 'settings' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Startup Settings</h3>
          <div className="space-y-4 max-w-md pt-2">
            <Input label="Custom Slug" defaultValue={`trustnet.io/startups/${startup.id}`} />
            <Button variant="primary" onClick={() => showToast('Settings Saved', 'Settings updated.', 'success')}>
              Save Settings
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
