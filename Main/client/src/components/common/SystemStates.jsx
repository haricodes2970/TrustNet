import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Clock, WifiOff, ArrowLeft } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const MaintenancePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Card className="p-8 max-w-md w-full text-center space-y-6 border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <Wrench className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black">Scheduled System Upgrade</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            TrustNet engine is undergoing performance enhancements. We'll be back online shortly!
          </p>
        </div>

        <Button variant="outline" size="md" className="w-full" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </Button>
      </Card>
    </div>
  );
};

export const ComingSoonPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Card className="p-8 max-w-md w-full text-center space-y-6 border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black">Coming Soon</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            This extended module is currently under active development and will launch in the next sprint.
          </p>
        </div>

        <Button variant="primary" size="md" className="w-full" onClick={() => navigate('/app/dashboard')}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>
      </Card>
    </div>
  );
};
