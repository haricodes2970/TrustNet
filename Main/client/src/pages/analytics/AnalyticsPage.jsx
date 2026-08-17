import React, { useEffect, useState } from 'react';
import { BarChart3, BriefcaseBusiness, CheckSquare, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { getMyStartups } from '../../lib/startupApi';
import { getAnalyticsOverview } from '../../lib/analyticsApi';

const Stat = ({ label, value, Icon }) => <Card className="p-5"><Icon className="h-5 w-5 text-trust-verified" /><p className="mt-4 font-mono text-2xl text-trust-ink">{value ?? 0}</p><p className="mt-1 text-sm text-trust-slate">{label}</p></Card>;

export const AnalyticsPage = () => {
  const [startups, setStartups] = useState([]);
  const [startupId, setStartupId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { (async () => { try { const entries = await getMyStartups(); setStartups(entries); setStartupId(entries[0]?._id || entries[0]?.id || ''); } catch (err) { setError(err.message || 'Unable to load your startups.'); } finally { setLoading(false); } })(); }, []);
  useEffect(() => { if (!startupId) return; (async () => { setLoading(true); setError(''); try { setData(await getAnalyticsOverview(startupId)); } catch (err) { setError(err.message || 'Unable to load analytics.'); } finally { setLoading(false); } })(); }, [startupId]);

  if (loading && !startups.length) return <p className="text-sm text-trust-slate">Loading analytics…</p>;
  if (error) return <EmptyState icon={BarChart3} title="Analytics unavailable" description={error} />;
  if (!startups.length) return <EmptyState icon={BarChart3} title="No startup analytics yet" description="Create or join a startup to view its real analytics." />;

  return <div className="space-y-6"><header><h1 className="font-display text-3xl text-trust-ink">Analytics</h1><p className="mt-1 text-sm text-trust-slate">Live operational data for your selected startup.</p></header><label className="block max-w-md text-sm font-semibold text-trust-ink">Startup<select className="mt-2 h-11 w-full rounded border border-trust-slate/30 bg-white px-3 text-sm focus-ring" value={startupId} onChange={(event) => setStartupId(event.target.value)}>{startups.map((startup) => <option key={startup._id || startup.id} value={startup._id || startup.id}>{startup.name}</option>)}</select></label>{loading ? <p className="text-sm text-trust-slate">Loading analytics…</p> : <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Team members" value={data?.startup?.teamSize} Icon={Users} /><Stat label="Projects" value={data?.projects?.totalProjects} Icon={BriefcaseBusiness} /><Stat label="Tasks" value={data?.tasks?.totalTasks} Icon={CheckSquare} /><Stat label="Task completion" value={`${data?.tasks?.completionRate ?? 0}%`} Icon={BarChart3} /></section>}</div>;
};
