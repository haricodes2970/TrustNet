import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';

export const EventCard = ({ event }) => {
  const navigate = useNavigate();
  const { toggleBookmark, showToast } = useApp();

  return (
    <Card hoverEffect className="overflow-hidden border-slate-200 flex flex-col justify-between h-full">
      <div>
        <div className="relative h-36 w-full bg-slate-100">
          <img
            src={event.banner}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3">
            <Badge variant="emerald">{event.category}</Badge>
          </div>
        </div>

        <div className="p-5">
          <h3
            onClick={() => navigate(`/app/events/${event.id}`)}
            className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer mb-2 line-clamp-1"
          >
            {event.title}
          </h3>

          <div className="space-y-1.5 text-xs text-slate-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.venue}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-0 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          {event.attendeesCount} Registered
        </span>

        {event.isRegistered ? (
          <Button size="sm" variant="secondary" disabled className="text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Registered</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              toggleBookmark('event', event.id);
              showToast('Event Registered', `Reserved your ticket for ${event.title}`, 'success');
            }}
          >
            <span>Register</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
