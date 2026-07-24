import React, { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Input } from '../../components/ui/Input';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
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

  const [investorPipeline] = useState([
    { id: 'inv1', name: 'Horizon Ventures', contact: 'Sarah Chen', stage: 'Meeting', check: '$500,000', notes: 'Loved the AI workflow demo. Scheduling diligence call.' },
    { id: 'inv2', name: 'Sequoia Capital', contact: 'Michael Chang', stage: 'Due Diligence', check: '$1,000,000', notes: 'Reviewing cap table and security compliance.' },
    { id: 'inv3', name: 'Founders Fund', contact: 'David Sachs', stage: 'Term Sheet', check: '$1,500,000', notes: 'Term sheet issued for Seed round leadership.' }
  ]);

  const [jobPostings] = useState([
    { id: 'job1', title: 'Senior Frontend Engineer (React + Tailwind)', type: 'Full-time', location: 'San Francisco / Remote', applicants: 34, status: 'Active' },
    { id: 'job2', title: 'AI Research Scientist (LLM Agents)', type: 'Full-time', location: 'San Francisco', applicants: 18, status: 'Active' }
  ]);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleRunAiAdvisor = (e) => {
    e.preventDefault();
    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
      setAiFeedback(
        `🤖 TrustNet AI Advisor Analysis for ${startup.name}:\n\n1. Pitch Deck Score: 92/100 (Strong market timing, exceptional founder-market fit).\n2. Investor Readiness: Your $${(startup.fundingTarget/1000000).toFixed(1)}M round is priced competitively. Focus outreach on Tier 1 Seed SaaS funds.\n3. Recommended Action: Follow up with Horizon Ventures with updated MRR growth metrics.`
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
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/app/startups/my')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        <span>Back to My Startups</span>
      </button>

      {/* Header Showcase Banner */}
      <Card className="border-slate-200/80 bg-white">
        <div className="h-44 sm:h-56 w-full bg-slate-100 relative">
          <img src={startup.banner} alt={startup.name} className="w-full h-full object-cover" />
        </div>

        <div className="p-6 sm:p-8 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white">
                <img src={startup.logo} alt={startup.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{startup.name}</h1>
                  <Badge variant="emerald" size="md">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
                    Verified Startup
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-1">{startup.tagline}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/app/startups/${startup.id}`)}>
                <ExternalLink className="w-4 h-4" strokeWidth={1.75} />
                <span>Public View</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => showToast('Link Copied', `Copied trustnet.io/startups/${startup.id}`, 'info')}>
                <Share2 className="w-4 h-4" strokeWidth={1.75} />
                <span>Share Pitch</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <Card className="p-2 border-slate-200/80 bg-white overflow-x-auto">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* SUB-DASHBOARD CONTENTS */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-slate-200/80">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Profile Views</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">3,450</h3>
              <span className="text-xs text-emerald-600 font-semibold mt-2 block">+34% vs last month</span>
            </Card>

            <Card className="p-6 border-slate-200/80">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Team Size</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{teamMembers.length} Members</h3>
              <span className="text-xs text-slate-500 mt-2 block">2 open positions</span>
            </Card>

            <Card className="p-6 border-slate-200/80">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Funding Target</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">${(startup.fundingTarget / 1000000).toFixed(2)}M</h3>
              <span className="text-xs text-slate-500 mt-2 block">${(startup.fundingRaised / 1000000).toFixed(2)}M raised</span>
            </Card>

            <Card className="p-6 border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Health Score</span>
                <h3 className="text-3xl font-black text-emerald-600 mt-2">94%</h3>
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">Excellent</span>
              </div>
              <ProgressRing progress={94} size={56} strokeWidth={5} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 border-slate-200/80 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Business Description</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {startup.description}
                </p>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Industry</span>
                    <strong className="text-slate-800">{startup.industry}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Founded</span>
                    <strong className="text-slate-800">{startup.foundedYear}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Location</span>
                    <strong className="text-slate-800">{startup.location}</strong>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 border-slate-200/80 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('investors')}>
                    <DollarSign className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                    <span>View Investor Pipeline</span>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('hiring')}>
                    <Briefcase className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                    <span>Post New Job Opening</span>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('documents')}>
                    <FileText className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                    <span>Upload Pitch Deck v2</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 2. TEAM MANAGEMENT */}
      {activeTab === 'team' && (
        <Card className="p-6 border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Team Members & Access Control</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage permissions, roles, and department access.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => showToast('Invite Sent', 'Sent email invitation to workspace.', 'success')}>
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
                    <h4 className="text-xs font-bold text-slate-900">{member.name}</h4>
                    <p className="text-[11px] text-slate-500">{member.role} • {member.dept}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="emerald">{member.access}</Badge>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3. ANALYTICS */}
      {activeTab === 'analytics' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Pitch Deck Visitor Trends</h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Area type="monotone" dataKey="views" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                <Area type="monotone" dataKey="downloads" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 4. DOCUMENT VAULT */}
      {activeTab === 'documents' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Document Vault</h3>
            <Button variant="primary" size="sm" onClick={() => showToast('Uploaded', 'Pitch Deck v2.4 uploaded.', 'success')}>
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Upload File</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 border border-slate-200/80 rounded-xl bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-7 h-7 text-emerald-500" strokeWidth={1.75} />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pitch Deck v2.4 (PDF)</h4>
                  <p className="text-[10px] text-slate-500">Updated 2 days ago • 14.2 MB</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Button>
            </div>

            <div className="p-4 border border-slate-200/80 rounded-xl bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-7 h-7 text-slate-600" strokeWidth={1.75} />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Financial Model 2026-2028 (XLSX)</h4>
                  <p className="text-[10px] text-slate-500">Updated last week • 4.8 MB</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 5. HIRING BOARD */}
      {activeTab === 'hiring' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Hiring Board</h3>
            <Button variant="primary" size="sm" onClick={() => showToast('Job Posted', 'Job opening published live.', 'success')}>
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Post Opening</span>
            </Button>
          </div>

          <div className="space-y-3 pt-2">
            {jobPostings.map((job) => (
              <div key={job.id} className="p-4 rounded-xl border border-slate-200/80 flex items-center justify-between bg-white">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                  <p className="text-[11px] text-slate-500">{job.type} • {job.location}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-600">{job.applicants} Applicants</span>
                  <Badge variant="emerald">{job.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. INVESTOR CRM PIPELINE */}
      {activeTab === 'investors' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Investor Pipeline CRM</h3>
            <Button variant="primary" size="sm" onClick={() => showToast('Investor Added', 'Added VC to CRM.', 'success')}>
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Add Investor</span>
            </Button>
          </div>

          <div className="divide-y divide-slate-100 pt-2">
            {investorPipeline.map((inv) => (
              <div key={inv.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{inv.name}</h4>
                  <p className="text-[11px] text-slate-500">Contact: {inv.contact} • {inv.notes}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900">{inv.check}</span>
                  <Badge variant="emerald">{inv.stage}</Badge>
                </div>
              </div>
            ))}
          </div>
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
