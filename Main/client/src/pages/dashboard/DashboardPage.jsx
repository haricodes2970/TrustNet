import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building,
  DollarSign,
  Users,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Lock,
  MapPin,
  Clock,
  Compass
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ProfileCompletionCard } from '../../components/cards/ProfileCompletionCard';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { VerificationBadge } from '../../components/ui/VerificationBadge';
import { StartupCard } from '../../components/cards/StartupCard';
import { PeopleCard } from '../../components/cards/PeopleCard';
import { PostCard } from '../../components/cards/PostCard';
import { getDashboardData } from '../../lib/dashboardApi';
import { BASE_URL, getToken } from '../../lib/apiClient';

export const DashboardPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeRole, setActiveRole] = useState('Entrepreneur');
  const [dashboardData, setDashboardData] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isDashboardLocked, setIsDashboardLocked] = useState(false);
  const [pageError, setPageError] = useState('');

  // Sync role from URL query param e.g. /app/dashboard?role=investor
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam) {
      const formatted = roleParam.charAt(0).toUpperCase() + roleParam.slice(1);
      const validRoles = ['Entrepreneur', 'Investor', 'Mentor'];
      if (validRoles.includes(formatted)) {
        setActiveRole(formatted);
      }
    }
  }, [searchParams]);

  const fetchData = async () => {
    setIsPageLoading(true);
    setPageError('');
    setIsDashboardLocked(false);

    try {
      const token = getToken();

      // Fetch verification details first
      const verificationResponse = await fetch(`${BASE_URL}/verification`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const verificationRes = await verificationResponse.json();
      if (verificationResponse.ok && verificationRes.success) {
        setVerificationData(verificationRes.data);
      }

      // Try fetching dashboard data
      try {
        const dashboardRes = await getDashboardData();
        setDashboardData(dashboardRes);
      } catch (err) {
        // If unverified, dashboard API returns 403 Forbidden
        if (err.status === 403) {
          setIsDashboardLocked(true);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setPageError(err.message || 'Failed to retrieve dashboard information.');
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const roles = [
    { id: 'Entrepreneur', label: 'Entrepreneur', icon: Building },
    { id: 'Investor', label: 'Investor', icon: DollarSign },
    { id: 'Mentor', label: 'Mentor', icon: Users }
  ];

  if (isPageLoading) {
    return (
      <div className="space-y-8 max-w-[1440px] mx-auto animate-pulse" aria-hidden="true">
        {/* Role switcher skeleton */}
        <div className="h-16 w-full bg-slate-100 rounded-2xl" />

        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content skeleton */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
              ))}
            </div>

            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="h-48 bg-slate-100 rounded-2xl" />
                <div className="h-48 bg-slate-100 rounded-2xl" />
              </div>
            </div>

            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="h-32 bg-slate-100 rounded-2xl" />
              <div className="h-32 bg-slate-100 rounded-2xl" />
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="lg:col-span-4 space-y-6">
            <div className="h-28 bg-slate-100 rounded-2xl" />
            <div className="h-56 bg-slate-100 rounded-2xl" />
            <div className="h-44 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center p-6">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Failed to Load Dashboard</h2>
        <p className="text-xs text-slate-500">{pageError}</p>
        <Button variant="outline" size="md" onClick={fetchData} className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  const isVerified = verificationData?.status === 'approved' || currentUser?.isVerified;

  // Format backend models for client card components
  const formattedStartups = (dashboardData?.recentStartups || []).map(s => ({
    ...s,
    id: s._id,
    logo: s.logoUrl,
    stageLabel: s.stage
  }));

  const formattedPeople = (dashboardData?.suggestedPeople || []).map(p => ({
    ...p,
    id: p._id,
    avatar: p.avatarUrl,
    name: p.fullName,
    headline: p.designation,
    role: p.role || 'Founder'
  }));

  const formattedPosts = (dashboardData?.trendingPosts || []).map(p => ({
    ...p,
    id: p._id,
    author: {
      ...p.author,
      name: p.author?.fullName || 'User',
      avatar: p.author?.avatarUrl || '',
      headline: p.author?.designation || ''
    },
    timeAgo: new Date(p.createdAt).toLocaleDateString()
  }));

  // Tailored locked messages depending on KYC state
  const getLockedMessage = () => {
    const status = verificationData?.status || 'draft';
    switch (status) {
      case 'pending':
      case 'under_review':
        return {
          title: 'Verification Under Review',
          desc: 'Your uploaded identity documents are currently being audited by a platform administrator. To maintain a high-trust ecosystem, all platform dealflow dashboards are locked until verification is complete.'
        };
      case 'rejected':
      case 'resubmission_requested':
        return {
          title: 'Verification Rejected',
          desc: 'Your verification submission was rejected or requires changes. Please update and re-submit your identity documents to unlock your dashboard.'
        };
      default:
        return {
          title: 'Identity Verification Required',
          desc: 'To protect dealflow privacy, platforms, and fundraising integrity, dashboard details are locked until identity credentials are uploaded and approved by a platform administrator.'
        };
    }
  };

  const lockContent = getLockedMessage();

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Role Switcher Navigation Bar */}
      <Card className="p-2 border-slate-200/80 bg-white shadow-soft-sm">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max" role="tablist" aria-label="Ecosystem Role Selection">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveRole(r.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-trust-verified/50 ${
                    isActive
                      ? 'bg-trust-verified text-white shadow-soft-sm'
                      : 'text-trust-slate hover:bg-trust-slate/10'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          <Badge variant="verified" className="hidden lg:flex">
            Role Switcher Active
          </Badge>
        </div>
      </Card>

      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back, {currentUser?.fullName || currentUser?.name || 'Founder'}
            {isVerified && <VerificationBadge size="lg" />}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Here is your real-time {activeRole.toLowerCase()} ecosystem dashboard overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content (Left Column - 8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          {isDashboardLocked ? (
            <Card className="p-8 border-trust-signal/30 bg-trust-signal/5 space-y-6 text-center">
              <div className="w-14 h-14 bg-trust-signal/10 text-trust-signal rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-trust-ink">{lockContent.title}</h3>
                <p className="text-xs text-trust-slate leading-relaxed max-w-md mx-auto">
                  {lockContent.desc}
                </p>
              </div>
              <div className="pt-2">
                <Button variant="primary" size="md" onClick={() => navigate('/verification')}>
                  <span>Complete Verification Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Dynamic Stats Row based on Active Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-slate-200/80 hoverEffect">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {activeRole === 'Entrepreneur' ? 'My Startups' : activeRole === 'Investor' ? 'Pipeline Deals' : 'Active Startups'}
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 mt-2">
                    {dashboardData?.stats?.startups || 0} Registered
                  </h3>
                  <span className="text-xs text-trust-verified font-semibold mt-2 block">Real-time platform records</span>
                </Card>

                <Card className="p-6 border-slate-200/80 hoverEffect">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {activeRole === 'Entrepreneur' ? 'Collaboration Requests' : activeRole === 'Investor' ? 'Inbound Deals' : 'Mentorship Requests'}
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 mt-2">
                    {dashboardData?.stats?.collaborations || 0} Pending
                  </h3>
                  <span className="text-xs text-slate-500 mt-2 block">Requires your review</span>
                </Card>

                <Card className="p-6 border-slate-200/80 hoverEffect">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Communities</span>
                  <h3 className="text-3xl font-black text-slate-900 mt-2">
                    {dashboardData?.stats?.communities || 0} Active
                  </h3>
                  <span className="text-xs text-slate-500 mt-2 block">Connect with groups</span>
                </Card>

                <Card className="p-6 border-slate-200/80 hoverEffect">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Forum Posts</span>
                  <h3 className="text-3xl font-black text-slate-900 mt-2">
                    {dashboardData?.stats?.posts || 0} Shared
                  </h3>
                  <span className="text-xs text-trust-verified font-semibold mt-2 block">Updates and announcements</span>
                </Card>
              </div>

              {/* Recent Startups */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between">
                  <span>Recent Platform Startups</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/app/discover')} className="text-xs" aria-label="Discover all startups">
                    <span>Discover More</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </h3>
                {formattedStartups.length === 0 ? (
                  <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
                    No startups registered on the platform yet.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {formattedStartups.slice(0, 2).map((startup) => (
                      <StartupCard key={startup.id} startup={startup} />
                    ))}
                  </div>
                )}
              </div>

              {/* Trending Posts */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between">
                  <span>Ecosystem Feed updates</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/app/feed')} className="text-xs" aria-label="Go to community feed">
                    <span>Go to Feed</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </h3>
                {formattedPosts.length === 0 ? (
                  <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
                    No recent activities or posts shared yet.
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {formattedPosts.slice(0, 2).map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested Communities */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between">
                  <span>Suggested Communities</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/app/communities')} className="text-xs" aria-label="Explore all communities">
                    <span>Explore All</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </h3>
                {(dashboardData?.suggestedCommunities || []).length === 0 ? (
                  <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
                    No communities available right now.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(dashboardData?.suggestedCommunities || []).slice(0, 2).map((community) => (
                      <Card key={community._id} className="p-4 border-slate-200 flex items-start gap-4 hoverEffect">
                        {community.logoUrl ? (
                          <img src={community.logoUrl} alt={community.name} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-trust-verified/10 text-trust-verified flex items-center justify-center font-bold text-sm">
                            C
                          </div>
                        )}
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900">{community.name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{community.description}</p>
                          <span className="text-[10px] text-trust-verified font-semibold bg-trust-verified/10 px-2 py-0.5 rounded-full inline-block">
                            {community.memberCount || 0} members
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Summary (Right Column - 4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Identity Stamp */}
          {verificationData && (
            <Card className="p-5 border-slate-200/80 bg-white shadow-soft-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identity Status</h4>
              <LedgerStamp
                status={verificationData.status}
                submittedAt={verificationData.submittedAt}
                reviewedAt={verificationData.reviewedAt}
              />
            </Card>
          )}

          {/* Profile Completion Card */}
          <ProfileCompletionCard />

          {/* Quick Actions Card */}
          <Card className="p-5 border-slate-200/80 bg-white shadow-soft-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/profile/edit')}
                className="w-full text-xs py-2 h-auto text-left justify-start"
                aria-label="Edit Profile Details"
              >
                <span>Edit Profile</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/verification')}
                className="w-full text-xs py-2 h-auto text-left justify-start"
                aria-label="Access Identity KYC Verification"
              >
                <span>Identity KYC</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/startups/create')}
                className="w-full text-xs py-2 h-auto text-left justify-start"
                aria-label="Create Startup Listing"
              >
                <span>Create Startup</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/discover')}
                className="w-full text-xs py-2 h-auto text-left justify-start"
                aria-label="Discover Startups and Deals"
              >
                <span>Find Deals</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/people')}
                className="w-full text-xs py-2 h-auto text-left justify-start"
                aria-label="Access Ecosystem People Directory"
              >
                <span>Directory</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/messages')}
                className="w-full text-xs py-2 h-auto text-left justify-start"
                aria-label="Open Messages Center"
              >
                <span>Messages</span>
              </Button>
            </div>
          </Card>

          {/* Suggested People */}
          {!isDashboardLocked && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested People</h4>
              {formattedPeople.length === 0 ? (
                <Card className="p-4 text-center text-xs text-slate-500 border-dashed">
                  No suggested connections.
                </Card>
              ) : (
                <div className="space-y-4">
                  {formattedPeople.slice(0, 3).map((person) => (
                    <PeopleCard key={person.id} user={person} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
