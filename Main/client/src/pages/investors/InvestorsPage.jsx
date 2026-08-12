import React, { useEffect, useState } from 'react';
import { Building2, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { listInvestorProfiles } from '../../lib/investorApi';

export const InvestorsPage = () => {
  const [investors, setInvestors] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { (async () => { try { setInvestors(await listInvestorProfiles()); } catch (err) { setError(err.message || 'Unable to load investor profiles.'); } finally { setLoading(false); } })(); }, []);
  if (loading) return <p className="text-sm text-trust-slate">Loading investors…</p>;
  if (error) return <EmptyState icon={Users} title="Investor directory unavailable" description={error} />;
  if (!investors.length) return <EmptyState icon={Users} title="No investor profiles yet" description="Investor profiles will appear here as members publish them." />;
  return <div className="space-y-6"><header><h1 className="font-display text-3xl text-trust-ink">Investor directory</h1><p className="mt-1 text-sm text-trust-slate">Published investor profiles from TrustNet.</p></header><div className="grid gap-6 md:grid-cols-2">{investors.map((investor) => <Card key={investor._id} className="p-6"><Building2 className="h-6 w-6 text-trust-verified" /><h2 className="mt-4 text-lg font-semibold text-trust-ink">{investor.organization || 'Investor profile'}</h2><p className="mt-2 text-sm text-trust-slate">{investor.investmentThesis || 'No investment thesis provided.'}</p>{investor.preferredStages?.length ? <p className="mt-4 text-xs text-trust-slate">Stages: {investor.preferredStages.join(', ')}</p> : null}</Card>)}</div></div>;
};
