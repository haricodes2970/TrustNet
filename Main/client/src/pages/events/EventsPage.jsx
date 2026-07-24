import React from 'react';
import { Calendar } from 'lucide-react';
import { EventCard } from '../../components/cards/EventCard';
import { useApp } from '../../context/AppContext';

export const EventsPage = () => {
  const { events } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ecosystem Events & Pitch Nights</h1>
        <p className="text-xs text-slate-500 mt-1">Join virtual pitch nights, webinars, and founder meetups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(evt => (
          <EventCard key={evt.id} event={evt} />
        ))}
      </div>
    </div>
  );
};
