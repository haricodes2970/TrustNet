import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Rocket, Users, Globe, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Where Silicon Valley Meets Global Tech Talent
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          TrustNet is the modern Operating System for startups, venture investors, mentors, and ambitious builders worldwide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-3">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verified Identity</h3>
          <p className="text-xs text-slate-500">Every founder, VC, and mentor undergoes TrustNet verification.</p>
        </Card>

        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-3">
          <Rocket className="w-8 h-8 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pitch Directory</h3>
          <p className="text-xs text-slate-500">Real-time pitch decks, milestones, cap tables, and investor pipeline CRM.</p>
        </Card>

        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-3">
          <Users className="w-8 h-8 text-violet-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Founder Ecosystem</h3>
          <p className="text-xs text-slate-500">Connect with Y Combinator alumni, mentor sessions, and co-founder matchmaking.</p>
        </Card>
      </div>
    </div>
  );
};
