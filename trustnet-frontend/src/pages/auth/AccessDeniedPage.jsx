import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const AccessDeniedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center border-slate-200/80 bg-white shadow-soft-lg space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <ShieldAlert className="w-8 h-8" strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            You don't have permission to access this administrative page.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center justify-center gap-2 font-medium">
          <Lock className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          <span>Administrator Authorization Required</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            <span>Go Back</span>
          </Button>

          <Button
            variant="primary"
            className="flex-1"
            onClick={() => navigate('/app/dashboard')}
          >
            <Home className="w-4 h-4" strokeWidth={1.75} />
            <span>Return to Dashboard</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
