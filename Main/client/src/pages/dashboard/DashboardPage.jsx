import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, CircleAlert, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LedgerStamp } from '../../components/ui/LedgerStamp';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { getDashboard } from '../../lib/dashboardApi';

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';

export const DashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); setError(''); try { setData(await getDashboard()); } catch (err) { setError(err.message || 'Dashboard could not be loaded.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const user = data?.user || currentUser;
  const verification = user?.verificationStatus || (user?.isVerified ? 'approved' : 'pending');
  const primaryAction = data?.stats?.startups ? { label: 'View startups', to: '/app/startups/my' } : { label: 'Create your startup', to: '/app/startups/create' };

  if (loading) return <div className="grid gap-6"><Skeleton className="h-36 w-full" /><div className="grid gap-6 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;
  if (error) return <section className="rounded-lg border border-trust-alert/30 bg-white p-8 text-center"><CircleAlert className="mx-auto mb-3 text-trust-alert" /><h1 className="font-display text-2xl">Dashboard unavailable</h1><p className="mx-auto mt-2 max-w-lg text-sm text-trust-slate">{error}</p><Button className="mt-5" onClick={load}><RefreshCw className="h-4 w-4" />Try again</Button></section>;

  return <div className="mx-auto grid max-w-6xl gap-8 pb-8">
    <header className="grid gap-5 border-b border-trust-ink/20 pb-6 md:grid-cols-[1fr_auto] md:items-end">
      <div><p className="font-mono text-xs uppercase tracking-[.16em] text-trust-slate">Your workspace</p><h1 className="mt-2 font-display text-3xl text-trust-ink sm:text-4xl">Welcome, {user?.fullName || user?.name || 'there'}.</h1><p className="mt-2 max-w-xl text-sm text-trust-slate">A concise view of the work and trusted network available to you.</p></div>
      <Button onClick={() => navigate(primaryAction.to)}>{primaryAction.label}<ArrowRight className="h-4 w-4" /></Button>
    </header>
    <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
      <Card className="rounded-lg border-trust-ink/15 bg-white p-6 shadow-soft-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display text-2xl">Trust status</h2><p className="mt-1 text-sm text-trust-slate">Your account lifecycle is visible here.</p></div><LedgerStamp label="TrustNet verification" state={verification} timestamp={formatDate(user?.updatedAt || user?.createdAt)} /></div><div className="mt-6 flex gap-3 border-t border-trust-ink/15 pt-5"><ShieldCheck className="mt-0.5 h-5 w-5 text-trust-verified" /><p className="text-sm text-trust-slate">{verification === 'approved' ? 'Your verification is approved.' : 'Verification is not yet approved. Complete the required steps to unlock verified-only actions.'}</p></div></Card>
      <Card className="rounded-lg border-trust-ink/15 bg-white p-6 shadow-soft-sm"><h2 className="font-display text-2xl">Next step</h2><p className="mt-2 text-sm text-trust-slate">{data?.stats?.startups ? 'Continue shaping your startup presence and discover collaborators.' : 'Create a startup profile to begin building your presence in TrustNet.'}</p><Button variant="outline" className="mt-5" onClick={() => navigate(primaryAction.to)}>{primaryAction.label}</Button></Card>
    </section>
    <section aria-label="Workspace summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['Startups', data?.stats?.startups, Building2], ['Communities', data?.stats?.communities, Users], ['Collaborations', data?.stats?.collaborations, Users], ['Recent posts', data?.stats?.posts, Building2]].map(([label, value, Icon]) => <Card key={label} className="rounded-lg border-trust-ink/15 bg-white p-5 shadow-soft-sm"><Icon className="h-5 w-5 text-trust-verified" /><p className="mt-5 font-mono text-2xl text-trust-ink">{value ?? 0}</p><p className="mt-1 text-sm text-trust-slate">{label}</p></Card>)}
    </section>
    <section className="grid gap-6 lg:grid-cols-2"><Card className="rounded-lg border-trust-ink/15 bg-white p-6 shadow-soft-sm"><h2 className="font-display text-2xl">Recent startups</h2>{data?.recentStartups?.length ? <ul className="mt-4 divide-y divide-trust-ink/10">{data.recentStartups.map((startup) => <li className="py-4" key={startup._id}><button className="focus-ring text-left" onClick={() => navigate(`/app/startups/${startup._id}`)}><span className="block font-semibold text-trust-ink">{startup.name}</span><span className="mt-1 block text-sm text-trust-slate">{startup.tagline || startup.stage || 'Startup profile'}</span></button></li>)}</ul> : <EmptyState icon={Building2} title="No startups yet" description="Create a startup profile when you are ready." actionLabel="Create startup" onAction={() => navigate('/app/startups/create')} className="mt-4 p-6" />}</Card><Card className="rounded-lg border-trust-ink/15 bg-white p-6 shadow-soft-sm"><h2 className="font-display text-2xl">Recent activity</h2>{data?.recentActivity?.length ? <ul className="mt-4 divide-y divide-trust-ink/10">{data.recentActivity.map((activity) => <li className="py-4" key={activity.id}><p className="font-semibold text-trust-ink">{activity.title || 'Community update'}</p><p className="mt-1 line-clamp-2 text-sm text-trust-slate">{activity.content}</p><time className="mt-2 block font-mono text-xs text-trust-slate">{formatDate(activity.createdAt)}</time></li>)}</ul> : <EmptyState icon={Users} title="No recent activity" description="Activity from your workspace will appear here." className="mt-4 p-6" />}</Card></section>
  </div>;
};
