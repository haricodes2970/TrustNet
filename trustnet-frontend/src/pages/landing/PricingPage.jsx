import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Rocket, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <Badge variant="emerald">Transparent Pricing</Badge>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Simple Plans for Founders & Investors
        </h1>
        <p className="text-sm text-slate-500">Free forever for early-stage founders. Upgrade for VC pipeline analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8 border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Founder Starter</h3>
            <p className="text-xs text-slate-500 mt-1">For early founders creating pitch decks</p>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-4">$0 <span className="text-xs font-normal text-slate-400">/ forever</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate('/signup')}>
            Get Started Free
          </Button>
        </Card>

        <Card className="p-8 border-emerald-500 dark:border-emerald-500 space-y-6 relative ring-2 ring-emerald-500/30">
          <div className="absolute -top-3 right-6">
            <Badge variant="emerald">Most Popular</Badge>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Startup OS Pro</h3>
            <p className="text-xs text-slate-500 mt-1">Full startup CRM, hiring, & investor pipeline</p>
            <div className="text-3xl font-black text-emerald-600 mt-4">$49 <span className="text-xs font-normal text-slate-400">/ month</span></div>
          </div>
          <Button variant="primary" className="w-full" onClick={() => navigate('/signup')}>
            Start 14-Day Free Trial
          </Button>
        </Card>

        <Card className="p-8 border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">VC & Angel Partner</h3>
            <p className="text-xs text-slate-500 mt-1">Full dealflow pipeline & direct founder messaging</p>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-4">$199 <span className="text-xs font-normal text-slate-400">/ month</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate('/signup')}>
            Join VC Network
          </Button>
        </Card>
      </div>
    </div>
  );
};
