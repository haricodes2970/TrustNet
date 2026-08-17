import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RefreshCw, Layers, Lock, Inbox, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const MentorsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // States: 'loading' | 'unavailable' | 'empty' | 'error' | 'unauthorized'
  const [viewState, setViewState] = useState('loading');

  // Sync initial view state with auth status and load simulator
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setViewState('unauthorized');
      } else {
        setViewState('unavailable'); // Defaults to unavailable due to backend-gap
      }
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [isAuthenticated, authLoading, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Determine if we should show the QA switcher (dev-only: localhost or query parameter ?qa=true)
  const showQASwitcher = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.search.includes('qa=true');

  // Render content based on viewState
  const renderContent = () => {
    if (isLoading || viewState === 'loading') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-busy="true" aria-label="Loading mentors">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 border-slate-200 dark:border-slate-800 flex flex-col justify-between h-64 animate-pulse">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (viewState === 'unauthorized') {
      return (
        <Card className="p-8 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Authentication Required</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Please log in to view and schedule sessions with verified platform mentors.
            </p>
          </div>
          <div className="max-w-xs mx-auto">
            <Button 
              variant="primary" 
              className="w-full focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              onClick={() => navigate('/login')}
            >
              <span>Go to Login</span>
            </Button>
          </div>
        </Card>
      );
    }

    if (viewState === 'error') {
      return (
        <Card className="p-8 border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Failed to Fetch Mentors</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Error 500: Internal Server Error. The mentors directory could not be reached. Please check your network connection.
            </p>
          </div>
          <div className="max-w-xs mx-auto">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/50 focus:ring-2 focus:ring-red-500 focus:outline-none"
              onClick={handleRetry}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Request</span>
            </Button>
          </div>
        </Card>
      );
    }

    if (viewState === 'empty') {
      return (
        <Card className="p-12 border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Mentors Registered</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No verified mentors are currently available in the system. Please check back later.
            </p>
          </div>
        </Card>
      );
    }

    // Default: 'unavailable' / backend gap state
    return (
      <Card className="p-8 border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/50 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>Mentors Directory Offline</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The mentorship directory, matching, and session booking database services are pending backend deployment.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950 p-4 rounded-xl text-left max-w-md mx-auto space-y-3 shadow-sm">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Pending Backend Specifications:
          </span>
          <ul className="space-y-2 text-xs font-mono text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <code>GET /api/v1/mentors</code>
            </li>
            <li className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <code>POST /api/v1/mentors/book</code>
            </li>
          </ul>
        </div>

        <div className="max-w-xs mx-auto">
          <Button 
            variant="outline" 
            size="md" 
            className="w-full flex items-center justify-center gap-2 hover:bg-rose-100/50 hover:border-rose-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Syncing Directory</span>
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Dev/QA State Switcher Controls - Only rendered on localhost/localhost IP */}
      {showQASwitcher && (
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-soft-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              QA Simulation Controls (Local Dev Only):
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['loading', 'unavailable', 'empty', 'error', 'unauthorized'].map((state) => (
              <button
                key={state}
                onClick={() => setViewState(state)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                  viewState === state
                    ? 'bg-emerald-500 text-white shadow-soft-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {state.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight dark:text-white">Verified Mentors & Advisors</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Get 1:1 guidance from ex-FAANG leaders and serial founders</p>
      </div>

      {renderContent()}
    </div>
  );
};
