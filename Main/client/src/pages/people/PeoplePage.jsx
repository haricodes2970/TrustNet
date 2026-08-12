import React, { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { PeopleCard } from '../../components/cards/PeopleCard';
import { EmptyState } from '../../components/common/EmptyState';
import { search as searchApi } from '../../lib/searchApi';

export const PeoplePage = () => {
  const [query, setQuery] = useState(''); const [users, setUsers] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); const term = query.trim(); if (!term) return; setLoading(true); setError(''); try { const result = await searchApi(term); setUsers(result.users || []); } catch (err) { setError(err.message || 'Unable to search people.'); } finally { setLoading(false); } };
  const cards = users.map((user) => ({ ...user, id: user._id || user.id, name: user.fullName || user.username, avatar: user.avatarUrl, headline: user.designation }));
  return <div className="space-y-6"><header><h1 className="font-display text-3xl text-trust-ink">Explore people</h1><p className="mt-1 text-sm text-trust-slate">Search active TrustNet members by name or username.</p></header><form onSubmit={submit} className="flex gap-3"><Input icon={Search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" /><button className="min-h-[44px] rounded bg-trust-verified px-4 text-sm font-semibold text-white focus-ring">Search</button></form>{error && <p className="text-sm text-trust-alert">{error}</p>}{loading ? <p className="text-sm text-trust-slate">Searching…</p> : cards.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{cards.map((user) => <PeopleCard key={user.id} user={user} />)}</div> : <EmptyState icon={Users} title={query ? 'No people found' : 'Search the network'} description={query ? 'No active member matched that search.' : 'Enter a name or username to search the real member directory.'} />}</div>;
};
