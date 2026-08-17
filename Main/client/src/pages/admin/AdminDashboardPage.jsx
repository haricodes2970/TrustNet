import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Rocket, 
  Check, 
  X, 
  ShieldCheck, 
  BarChart3, 
  Bell, 
  Settings, 
  FileText, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  GraduationCap, 
  Flag, 
  HelpCircle, 
  Activity, 
  Lock, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  Ban, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { useApp } from '../../context/AppContext';
import * as adminApi from '../../lib/adminApi';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

const analyticsData = [
  { month: 'Jan', users: 4200, revenue: 18400 },
  { month: 'Feb', users: 6800, revenue: 24500 },
  { month: 'Mar', users: 9500, revenue: 31200 },
  { month: 'Apr', users: 12400, revenue: 38900 },
  { month: 'May', users: 15100, revenue: 44200 },
  { month: 'Jun', users: 18420, revenue: 52100 }
];

// Only Verification is wired to a real backend endpoint (see
// docs/Technical_Documentation_v2.md §6/§9 -- the admin API surface is
// verification-review only). Every other section below is a UI preview
// with no corresponding backend model or route; this banner says so
// instead of silently presenting fabricated numbers as live data.
const DemoDataNotice = () => (
  <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-[11px] font-semibold">
    <ShieldAlert className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
    <span>Demo preview -- this section has no backend endpoint yet. Numbers and actions here are illustrative only.</span>
  </div>
);

export const AdminDashboardPage = () => {
  const { showToast } = useApp();

  const [activeSection, setActiveSection] = useState('overview');
  const [managementSubTab, setManagementSubTab] = useState('users');
  const [contentSubTab, setContentSubTab] = useState('posts');
  const [moderationSubTab, setModerationSubTab] = useState('reports');
  const [settingsSubTab, setSettingsSubTab] = useState('roles-permissions');

  const [searchQuery, setSearchQuery] = useState('');

  // Sample State Data
  const [usersList, setUsersList] = useState([
    { id: 'usr_1', name: 'Alex Morgan', email: 'alex@nexusai.io', role: 'Entrepreneur', status: 'Active', verified: true },
    { id: 'usr_2', name: 'Sarah Chen', email: 'sarah@horizonvc.com', role: 'Investor', status: 'Active', verified: true },
    { id: 'usr_3', name: 'Dr. Marcus Vance', email: 'marcus@mit.edu', role: 'Mentor', status: 'Active', verified: true },
    { id: 'usr_4', name: 'Elena Rostova', email: 'elena@stanford.edu', role: 'Entrepreneur', status: 'Active', verified: false },
    { id: 'usr_5', name: 'David Miller', email: 'david@paypulse.io', role: 'Entrepreneur', status: 'Suspended', verified: false }
  ]);

  // Live data -- GET /api/v1/admin/verifications (the only admin capability
  // with real backend support; see docs/Technical_Documentation_v2.md).
  const [verificationsQueue, setVerificationsQueue] = useState([]);
  const [verificationsLoading, setVerificationsLoading] = useState(true);
  const [verificationsError, setVerificationsError] = useState('');
  const [actioningId, setActioningId] = useState(null);

  // Per-user document detail. The queue LIST only returns document
  // summaries (type/status/uploadedAt, no URL, on purpose). The actual
  // viewable files are short-lived signed Cloudinary URLs returned only by
  // GET /admin/verifications/:id, so we fetch them on demand when the admin
  // opens a request. { [userId]: { status, docs, error } }
  const [docDetail, setDocDetail] = useState({});

  const loadDocuments = useCallback(async (userId) => {
    setDocDetail((prev) => ({ ...prev, [userId]: { status: 'loading', docs: [], error: '' } }));
    try {
      const detail = await adminApi.getVerification(userId);
      setDocDetail((prev) => ({ ...prev, [userId]: { status: 'ready', docs: detail?.verificationDocuments || [], error: '' } }));
    } catch (err) {
      setDocDetail((prev) => ({ ...prev, [userId]: { status: 'error', docs: [], error: err.message || 'Could not load documents.' } }));
    }
  }, []);

  const loadVerifications = useCallback(async () => {
    setVerificationsLoading(true);
    setVerificationsError('');
    try {
      const users = await adminApi.listVerifications();
      setVerificationsQueue(Array.isArray(users) ? users : []);
    } catch (err) {
      setVerificationsError(err.message || 'Failed to load verification queue.');
    } finally {
      setVerificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  const [reportsList, setReportsList] = useState([
    { id: 'rep_1', reporter: 'Alex Morgan', reported: 'Spam Pitch Bot', reason: 'Unsolicited mass DM pitches', date: 'Today' },
    { id: 'rep_2', reporter: 'Sarah Chen', reported: 'Fake Deck Listing', reason: 'Copyrighted pitch slides', date: 'Yesterday' }
  ]);

  const [broadcastMessage, setBroadcastMessage] = useState('');

  const handleApproveVerification = async (userId, name) => {
    setActioningId(userId);
    try {
      await adminApi.approveVerification(userId);
      setVerificationsQueue(prev => prev.filter(v => v._id !== userId));
      showToast('Identity Verified', `Approved badge for ${name}.`, 'success');
    } catch (err) {
      showToast('Approval Failed', err.message || 'Could not approve this verification.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectVerification = async (userId, name) => {
    const reason = window.prompt(`Reason for rejecting ${name}'s verification (optional):`) || undefined;
    setActioningId(userId);
    try {
      await adminApi.rejectVerification(userId, reason);
      setVerificationsQueue(prev => prev.filter(v => v._id !== userId));
      showToast('Verification Rejected', `Rejected submission for ${name}.`, 'info');
    } catch (err) {
      showToast('Rejection Failed', err.message || 'Could not reject this verification.', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleUserStatus = (userId) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        showToast('User Updated', `${u.name} is now ${nextStatus}.`, 'info');
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleBroadcastNotification = (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    showToast('Broadcast Sent', `Sent announcement to all 18,420 users.`, 'success');
    setBroadcastMessage('');
  };

  const sectionTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'management', label: 'Management', icon: Users },
    { id: 'verification', label: 'Verification', icon: ShieldCheck, badge: verificationsQueue.length },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'moderation', label: 'Moderation', icon: Flag, badge: reportsList.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/80">
              <ShieldAlert className="w-7 h-7 text-emerald-500" strokeWidth={1.75} />
            </div>
            <span>Enterprise Admin Console</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1.5">
            Full platform administration, user directory management, identity verifications, content moderation & system settings.
          </p>
        </div>

        <Badge variant="emerald" size="lg">
          <ShieldCheck className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
          Super Admin Mode
        </Badge>
      </div>

      {/* Main Navigation Tabs */}
      <Card className="p-2 border-slate-200/80 bg-white overflow-x-auto shadow-soft-sm">
        <Tabs tabs={sectionTabs} activeTab={activeSection} onChange={setActiveSection} />
      </Card>

      {/* 1. OVERVIEW SECTION */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          <DemoDataNotice />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Ecosystem Users</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">18,420</h3>
              <span className="text-xs text-emerald-600 font-semibold mt-2 block">+14% growth this month</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Verified Startups</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">1,240</h3>
              <span className="text-xs text-slate-500 mt-2 block">$50M+ total capital raised</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Verification</span>
              <h3 className="text-3xl font-black text-amber-600 mt-2">{verificationsQueue.length} Queue</h3>
              <span className="text-xs text-amber-600 font-semibold mt-2 block">Requires manual audit</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">System Health Uptime</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">99.98%</h3>
              <span className="text-xs text-emerald-600 font-semibold mt-2 block">All systems operational</span>
            </Card>
          </div>

          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">User Growth & Ecosystem Revenue</h3>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* 2. MANAGEMENT SECTION -- no GET /users list-all endpoint exists on
          the backend (only GET /users/:id), so this whole section is a
          UI preview, not real data. */}
      {activeSection === 'management' && (
        <div className="space-y-6">
          <DemoDataNotice />
          {/* Sub-tabs bar */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
            {[
              { id: 'users', label: 'Users Directory', icon: Users },
              { id: 'startups', label: 'Startups', icon: Rocket },
              { id: 'investors', label: 'Investors', icon: DollarSign },
              { id: 'mentors', label: 'Mentors', icon: Users },
              { id: 'professionals', label: 'Professionals', icon: Briefcase }
            ].map(sub => {
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setManagementSubTab(sub.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                    managementSubTab === sub.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* USERS SUB-TAB */}
          {managementSubTab === 'users' && (
            <Card className="p-6 border-slate-200/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">User Management Directory</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Search, filter roles, assign verification, or suspend accounts.</p>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    icon={Search}
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                  <Button variant="primary" size="sm">
                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                    <span>Add User</span>
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {usersList
                  .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((user) => (
                    <div key={user.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{user.name}</h4>
                            {user.verified && <Badge variant="emerald" size="sm">Verified</Badge>}
                          </div>
                          <p className="text-[11px] text-slate-500">{user.email} • Role: {user.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={user.status === 'Active' ? 'emerald' : 'rose'}>{user.status}</Badge>
                        <Button
                          variant={user.status === 'Active' ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleUserStatus(user.id)}
                        >
                          {user.status === 'Active' ? 'Suspend' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* STARTUPS SUB-TAB */}
          {managementSubTab === 'startups' && (
            <Card className="p-6 border-slate-200/80 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Startup Moderation & Cap Table Audit</h3>
              <p className="text-xs text-slate-500">Audit published pitch decks and funding targets.</p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                1,240 verified startups indexed in database. 0 pending flag reports.
              </div>
            </Card>
          )}

          {/* INVESTORS, MENTORS, PROFESSIONALS SUB-TABS */}
          {['investors', 'mentors', 'professionals'].includes(managementSubTab) && (
            <Card className="p-6 border-slate-200/80 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 capitalize">{managementSubTab} Management</h3>
              <p className="text-xs text-slate-500">Manage accreditation, ratings, and professional profiles.</p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                All records verified and active.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 3. VERIFICATION SECTION -- wired to the real backend
          (GET/POST /api/v1/admin/verifications, see adminApi.js) */}
      {activeSection === 'verification' && (
        <Card className="p-6 border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Verification Center Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Review identity documents and KYC submissions awaiting approval.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="emerald">{verificationsQueue.length} Pending</Badge>
              <Button variant="outline" size="sm" onClick={loadVerifications} disabled={verificationsLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${verificationsLoading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              </Button>
            </div>
          </div>

          {verificationsLoading && (
            <div className="p-6 text-center text-xs text-slate-500">Loading verification queue…</div>
          )}

          {!verificationsLoading && verificationsError && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 text-xs font-medium">
              {verificationsError}
            </div>
          )}

          {!verificationsLoading && !verificationsError && verificationsQueue.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">No pending verifications. All caught up.</div>
          )}

          <div className="space-y-3">
            {verificationsQueue.map((item) => (
              <div key={item._id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{item.fullName}</h4>
                    <Badge variant="emerald">{item.designation || item.role}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {item.email} • Submitted: {item.verificationSubmittedAt ? new Date(item.verificationSubmittedAt).toLocaleDateString() : 'Unknown'}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                    {(item.verificationDocuments || []).length} document(s) submitted
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const d = docDetail[item._id];
                    if (!d) {
                      return (
                        <Button variant="outline" size="sm" onClick={() => loadDocuments(item._id)}>
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Review documents</span>
                        </Button>
                      );
                    }
                    if (d.status === 'loading') {
                      return <Button variant="outline" size="sm" isLoading disabled><span>Loading…</span></Button>;
                    }
                    if (d.status === 'error') {
                      return (
                        <button type="button" onClick={() => loadDocuments(item._id)} className="text-[11px] font-semibold text-trust-alert hover:underline">
                          {d.error} — retry
                        </button>
                      );
                    }
                    if (!d.docs.length) {
                      return <span className="text-[11px] text-slate-500">No documents</span>;
                    }
                    return d.docs.map((doc) => (
                      <a
                        key={doc._id || doc.type}
                        href={doc.url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                        aria-disabled={!doc.url}
                      >
                        <Button variant="outline" size="sm" disabled={!doc.url}>
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>{doc.type}</span>
                        </Button>
                      </a>
                    ));
                  })()}
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={actioningId === item._id}
                    onClick={() => handleRejectVerification(item._id, item.fullName)}
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Reject</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={actioningId === item._id}
                    onClick={() => handleApproveVerification(item._id, item.fullName)}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Approve Badge</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. CONTENT SECTION -- no content-moderation model/route exists. */}
      {activeSection === 'content' && (
        <div className="space-y-6">
          <DemoDataNotice />
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
            {[
              { id: 'posts', label: 'Posts & Feed' },
              { id: 'events', label: 'Events' },
              { id: 'partnerships', label: 'Partnerships' },
              { id: 'featured-content', label: 'Featured Content' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setContentSubTab(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                  contentSubTab === sub.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 capitalize">{contentSubTab.replace('-', ' ')} Management</h3>
            <p className="text-xs text-slate-500">Manage feed posts, event approvals, and landing page showcases.</p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700">
              Content pipeline active. 0 pending approvals.
            </div>
          </Card>
        </div>
      )}

      {/* 5. MODERATION SECTION -- no report/dispute model exists. */}
      {activeSection === 'moderation' && (
        <div className="space-y-6">
          <DemoDataNotice />
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
            <button
              onClick={() => setModerationSubTab('reports')}
              className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[40px] ${
                moderationSubTab === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Reports ({reportsList.length})
            </button>
            <button
              onClick={() => setModerationSubTab('support')}
              className={`px-4 py-2 rounded-xl text-xs font-bold min-h-[40px] ${
                moderationSubTab === 'support' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Support Tickets
            </button>
          </div>

          {moderationSubTab === 'reports' && (
            <Card className="p-6 border-slate-200/80 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">User Dispute & Report Queue</h3>
              <div className="space-y-3 pt-2">
                {reportsList.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Reported: {rep.reported}</h4>
                      <p className="text-[11px] text-slate-500">By: {rep.reporter} • Reason: {rep.reason}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => showToast('Report Resolved', 'Dismissed report item.', 'info')}>
                      Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 6. ANALYTICS SECTION -- this is platform-wide admin analytics,
          distinct from the real per-startup Analytics module (see
          AnalyticsPage.jsx / GET /api/v1/analytics); no admin-wide
          analytics endpoint exists. */}
      {activeSection === 'analytics' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <DemoDataNotice />
          <h3 className="text-lg font-bold text-slate-900">Ecosystem Platform Analytics</h3>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 7. NOTIFICATIONS BROADCAST SECTION -- no broadcast/system-wide
          notification endpoint exists (Notification model is per-user,
          created by specific actions, not admin-broadcast). */}
      {activeSection === 'notifications' && (
        <Card className="p-6 border-slate-200/80 space-y-4">
          <DemoDataNotice />
          <h3 className="text-lg font-bold text-slate-900">System Announcement Broadcast</h3>
          <p className="text-xs text-slate-500">Broadcast notification message to all 18,420 registered users.</p>

          <form onSubmit={handleBroadcastNotification} className="space-y-4 max-w-xl pt-2">
            <textarea
              rows={4}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="e.g. TrustNet v2.4 Release: Live Pitch Bookings are now open!"
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
            />
            <Button type="submit" variant="primary">
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              <span>Broadcast Message</span>
            </Button>
          </form>
        </Card>
      )}

      {/* 8. SETTINGS SECTION -- no roles/permissions-editor, audit-log, or
          system-health endpoint exists on the backend. */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <DemoDataNotice />
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
            {[
              { id: 'roles-permissions', label: 'Roles & Permissions' },
              { id: 'platform-settings', label: 'Platform Settings' },
              { id: 'audit-logs', label: 'Audit Logs' },
              { id: 'system-health', label: 'System Health' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSettingsSubTab(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                  settingsSubTab === sub.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <Card className="p-6 border-slate-200/80 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 capitalize">{settingsSubTab.replace('-', ' ')}</h3>
            <p className="text-xs text-slate-500">Configure system parameters, RBAC roles, security logs, and latency monitoring.</p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span>Database Response Time</span>
                <strong className="text-emerald-600">14ms</strong>
              </div>
              <div className="flex justify-between">
                <span>API Gateway Latency</span>
                <strong className="text-emerald-600">22ms</strong>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
