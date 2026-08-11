import React, { useState, useEffect } from 'react';
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
  FileText,
  Loader2,
  Lock
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { PostCard } from '../../components/cards/PostCard';
import { StartupCard } from '../../components/cards/StartupCard';
import { VerificationBadge } from '../../components/ui/VerificationBadge';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { ProfileCompletionCard } from '../../components/cards/ProfileCompletionCard';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { BASE_URL, getToken } from '../../lib/apiClient';

export const ProfilePage = () => {
  const { currentUser, authState } = useAuth();
  const { posts, startups, showToast } = useApp();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProfile = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = getToken();
      const response = await fetch(`${BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Failed to load profile.');
      }
      setProfile(res.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'startups', label: 'Startups', badge: startups.length },
    { id: 'posts', label: 'Posts', badge: posts.length },
  ];

  if (authState === 'initializing' || isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-500">Loading profile data...</p>
      </div>
    );
  }

  if (authState === 'unauthenticated' || authState === 'expired') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center p-6">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Session Expired</h2>
        <p className="text-xs text-slate-500">Please sign in to access your profile settings.</p>
        <Button variant="primary" size="md" onClick={() => navigate('/login')} className="w-full">
          Sign In
        </Button>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center p-6">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Failed to Load Profile</h2>
        <p className="text-xs text-slate-500">{error || 'An unexpected server error occurred.'}</p>
        <Button variant="outline" size="md" onClick={fetchProfile} className="w-full">
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cover Banner & Profile Header */}
      <Card className="overflow-hidden border-slate-200">
        <div className="h-48 sm:h-64 w-full bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-100 relative" />

        <div className="p-6 sm:p-8 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            <Avatar
              src={profile.avatarUrl}
              alt={profile.fullName}
              size="2xl"
              isVerified={profile.isVerified}
              className="ring-4 ring-white bg-white shadow-soft-md"
            />
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('Link Copied', 'Profile URL copied to clipboard.', 'success');
              }}>
                <Share2 className="w-4 h-4" />
                <span>Share Profile</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/app/settings')}>
                <span>Edit Profile</span>
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center">
                {profile.fullName}
                {profile.isVerified && (
                  <VerificationBadge size="lg" className="ml-2" />
                )}
              </h1>
              <Badge variant="emerald" className="capitalize">{profile.role}</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-700 mt-1">{profile.designation || 'Founder'}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {profile.location}
                </span>
              )}
              {profile.websiteUrl && (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Globe className="w-3.5 h-3.5" />
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {profile.websiteUrl.replace(/^https?:\/\//, '')}
                  </a>
                </span>
              )}
            </div>

            {profile.bio && (
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl mt-4">
                {profile.bio}
              </p>
            )}

            {/* Profile Stats Bar */}
            <div className="flex items-center gap-6 text-xs text-slate-600 pt-6 mt-6 border-t border-slate-100 font-medium">
              <div><strong className="text-slate-900 font-black text-sm">{profile.followersCount || 0}</strong> Followers</div>
              <div><strong className="text-slate-900 font-black text-sm">{profile.followingCount || 0}</strong> Following</div>
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
            {profile.skills && profile.skills.length > 0 && (
              <Card className="p-6 border-slate-200">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Core Skills & Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, idx) => (
                    <Badge key={idx} variant="slate" size="md" className="py-1.5 px-3">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* LinkedIn Card */}
            {profile.linkedin && (
              <Card className="p-6 border-slate-200">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">Professional Connection</h3>
                <p className="text-xs text-slate-500 mb-4">Verify professional association via LinkedIn.</p>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Connect on LinkedIn</span>
                </a>
              </Card>
            )}
          </div>

          {/* Right Sidebar Widget */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Completion Strength */}
            <ProfileCompletionCard />

            {/* Identity Ledger Stamp */}
            <Card className="p-6 border-slate-200 space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Identity & Verification</h3>
              <LedgerStamp 
                status={profile.verificationStatus} 
                timestamp={profile.verificationSubmittedAt} 
                className="w-full"
              />
              {profile.verificationStatus !== 'approved' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full text-xs font-bold py-2.5 mt-2"
                  onClick={() => navigate('/verification')}
                >
                  {profile.verificationStatus === 'draft' || profile.verificationStatus === 'not_submitted' 
                    ? 'Start Verification Process' 
                    : 'Manage Documents'}
                </Button>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'startups' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {startups && startups.length > 0 ? (
            startups.map((s) => (
              <StartupCard key={s.id} startup={s} />
            ))
          ) : (
            <Card className="p-8 text-center text-xs text-slate-500 col-span-2 border-dashed">
              No startups registered yet.
            </Card>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {posts && posts.length > 0 ? (
            posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))
          ) : (
            <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
              No posts written yet.
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
