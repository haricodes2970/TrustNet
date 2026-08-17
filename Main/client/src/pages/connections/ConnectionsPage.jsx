import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';

export const ConnectionsPage = () => {
  const [activeTab, setActiveTab] = useState('connected');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const tabs = [
    { id: 'connected', label: 'My Connections' },
    { id: 'pending', label: 'Pending Requests' },
    { id: 'suggestions', label: 'Recommended' },
  ];

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMsg('');

    const timer = setTimeout(() => {
      if (active) {
        // Since no backend connections endpoint exists (Case B)
        setErrorMsg('The user connections and network invitation database system is pending backend routing deployment.');
        setIsLoading(false);
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight dark:text-white">Connection Management</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage network invitations and trusted ecosystem connections</p>
      </div>

      <Card className="p-2 border-slate-200 dark:border-slate-800">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading connections">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            </Card>
          ))}
        </div>
      ) : errorMsg ? (
        <Card className="p-8 border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/50 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <WifiOff className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Connection API Offline</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {errorMsg}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950 p-4 rounded-xl text-left max-w-md mx-auto space-y-3 shadow-sm">
            <span className="block text-xxs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Pending Backend Specifications:
            </span>
            <ul className="space-y-2 text-xs font-mono text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <code>GET /api/v1/connections</code>
              </li>
              <li className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <code>POST /api/v1/connections/request</code>
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
              <span>Retry Connection Sync</span>
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
