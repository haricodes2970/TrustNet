import React from 'react';
import { Activity, Heart, MessageSquare, UserPlus, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const ActivityPage = () => {
  const activities = [
    { title: 'Connected with Sarah Chen (Partner @ Horizon VC)', time: '2 hours ago', icon: UserPlus },
    { title: 'NexusAI reached $50k MRR milestone', time: '1 day ago', icon: Activity },
    { title: 'Verified YC W24 Founder credential', time: '3 days ago', icon: ShieldCheck }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Activity Stream</h1>
        <p className="text-xs text-slate-500 mt-1">Chronological log of ecosystem interactions and milestones</p>
      </div>

      <div className="space-y-4">
        {activities.map((a, idx) => {
          const Icon = a.icon;
          return (
            <Card key={idx} className="p-4 border-slate-200 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{a.title}</h4>
                <span className="text-[10px] text-slate-400">{a.time}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
