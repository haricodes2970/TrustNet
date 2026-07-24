import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Plus, 
  MessageSquare,
  Share2,
  Calendar,
  FileText
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { PostCard } from '../../components/cards/PostCard';
import { StartupCard } from '../../components/cards/StartupCard';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const ProfilePage = () => {
  const { currentUser } = useAuth();
  const { posts, startups, showToast } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'experience', label: 'Experience' },
    { id: 'startups', label: 'Startups', badge: startups.length },
    { id: 'posts', label: 'Posts', badge: posts.length },
    { id: 'timeline', label: 'Activity' },
  ];

  return (
    <div className="space-y-6">
      {/* Cover Banner & Profile Header */}
      <Card className="overflow-hidden border-slate-200">
        <div className="h-48 sm:h-64 w-full bg-slate-200 relative">
          <img
            src={currentUser.cover}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 sm:p-8 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            <Avatar
              src={currentUser.avatar}
              alt={currentUser.name}
              size="2xl"
              isVerified={currentUser.isVerified}
              className="ring-4 ring-white bg-white shadow-soft-md"
            />
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => showToast('Profile Link Copied', 'Copied trustnet.io/alex to clipboard.', 'info')}>
                <Share2 className="w-4 h-4" />
                <span>Share Profile</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/app/settings')}>
                <span>Edit Profile</span>
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{currentUser.name}</h1>
              <Badge variant="emerald">{currentUser.role}</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-700 mt-1">{currentUser.headline}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.organization}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.city}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <Globe className="w-3.5 h-3.5" />
                trustnet.io/alex
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl mt-4">
              {currentUser.bio}
            </p>

            {/* Profile Stats Bar */}
            <div className="flex items-center gap-6 text-xs text-slate-600 pt-6 mt-6 border-t border-slate-100 font-medium">
              <div><strong className="text-slate-900 font-black text-sm">{currentUser.connectionsCount}</strong> Connections</div>
              <div><strong className="text-slate-900 font-black text-sm">{currentUser.followersCount}</strong> Followers</div>
              <div><strong className="text-slate-900 font-black text-sm">184</strong> Pitch Deck Views</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <Card className="p-2 border-slate-200">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* Skills Card */}
            <Card className="p-6 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-4">Core Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {currentUser.skills.map((skill, idx) => (
                  <Badge key={idx} variant="slate" size="md" className="py-1.5 px-3">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Achievements Card */}
            <Card className="p-6 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                Achievements & Credentials
              </h3>
              <div className="space-y-3">
                {currentUser.achievements.map((ach, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-800">{ach}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Sidebar Widget */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-3">Verified Badges</h3>
              <div className="space-y-2">
                <Badge variant="emerald" className="w-full justify-center py-2">
                  Y Combinator W24 Founder
                </Badge>
                <Badge variant="blue" className="w-full justify-center py-2">
                  Verified TrustNet Angel
                </Badge>
              </div>
            </Card>

            {/* Business Credibility Card */}
            <Card className="p-6 border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                Business Credibility
              </h3>
              
              <div className="space-y-3 text-xs">
                {currentUser.startupStage && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Startup Stage</span>
                    <span className="text-slate-950 font-bold">{currentUser.startupStage}</span>
                  </div>
                )}
                {currentUser.industry && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Industry</span>
                    <span className="text-slate-950 font-bold">{currentUser.industry}</span>
                  </div>
                )}
                {currentUser.fundingRequirement && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Funding Goal</span>
                    <span className="text-slate-950 font-bold text-emerald-700">{currentUser.fundingRequirement}</span>
                  </div>
                )}
                {currentUser.revenue && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Revenue</span>
                    <span className="text-slate-950 font-bold">{currentUser.revenue}</span>
                  </div>
                )}
                {currentUser.partnershipAvailability && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Partnership Status</span>
                    <span className="text-slate-950 font-bold text-indigo-600">{currentUser.partnershipAvailability}</span>
                  </div>
                )}
                {currentUser.plan && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Subscription Tier</span>
                    <span className="text-emerald-700 font-black uppercase text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
                      {currentUser.plan === 'ProFounder' ? 'Pro Founder' : currentUser.plan === 'StartupPro' ? 'Startup Pro' : currentUser.plan === 'InvestorPro' ? 'Investor Pro' : currentUser.plan}
                    </span>
                  </div>
                )}
                {currentUser.portfolioLink && (
                  <div className="pt-2">
                    <a
                      href={currentUser.portfolioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      <span>View Pitch Deck / Portfolio</span>
                    </a>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'startups' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {startups.map((s) => (
            <StartupCard key={s.id} startup={s} />
          ))}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
};
