import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-soft-sm">
          <Rocket className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-slate-900">404 - Page Not Found</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          The page or startup deal room you are looking for doesn't exist or has been moved.
        </p>
        <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/app/dashboard')}>
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Button>
      </div>
    </div>
  );
};
