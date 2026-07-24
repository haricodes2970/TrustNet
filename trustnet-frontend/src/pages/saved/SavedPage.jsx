import React, { useState } from 'react';
import { Bookmark, Rocket, FileText, Briefcase, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { StartupCard } from '../../components/cards/StartupCard';
import { PostCard } from '../../components/cards/PostCard';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { EventCard } from '../../components/cards/EventCard';
import { useApp } from '../../context/AppContext';

export const SavedPage = () => {
  const { startups, posts, opportunities, events } = useApp();
  const [activeTab, setActiveTab] = useState('startups');

  const bookmarkedStartups = startups.filter(s => s.isBookmarked);
  const bookmarkedPosts = posts.filter(p => p.isBookmarked);
  const bookmarkedOpps = opportunities.filter(o => o.isBookmarked);
  const registeredEvents = events.filter(e => e.isRegistered);

  const tabs = [
    { id: 'startups', label: 'Saved Startups', badge: bookmarkedStartups.length },
    { id: 'posts', label: 'Saved Posts', badge: bookmarkedPosts.length },
    { id: 'opportunities', label: 'Opportunities', badge: bookmarkedOpps.length },
    { id: 'events', label: 'Saved Events', badge: registeredEvents.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Saved Content Center</h1>
        <p className="text-xs text-slate-500 mt-1">Access your bookmarked startups, pitch posts, and event tickets</p>
      </div>

      <Card className="p-2 border-slate-200">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {activeTab === 'startups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedStartups.map(s => <StartupCard key={s.id} startup={s} />)}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {bookmarkedPosts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookmarkedOpps.map(o => <OpportunityCard key={o.id} opportunity={o} />)}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registeredEvents.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
};
